import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntries, workSchedules, dayOccurrences, serverAbsences, users } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getCurrentBrazilDate, BRAZIL_TZ } from '@/lib/timezone';

// Converte timestamp ISO/Date para minutos desde meia-noite (no fuso do Brasil)
function isoToMinutes(iso: string | Date | null): number {
  if (!iso) return 0;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  return h * 60 + m;
}

// Converte "HH:MM:SS" ou "HH:MM" em minutos desde meia-noite
function timeToMinutes(time: string | null): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

// Converte minutos em "XhYY"
function minutesToString(mins: number): string {
  const sign = mins < 0 ? '-' : '+';
  const absMins = Math.abs(mins);
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const monthParam = searchParams.get('month');

    let targetUserId = session.userId;
    if (session.role === 'hr' && userIdParam) {
      targetUserId = parseInt(userIdParam, 10);
    } else if (session.role === 'server' && userIdParam && parseInt(userIdParam, 10) !== session.userId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    let year: number, month: number;
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      year = y;
      month = m;
    } else {
      const today = getCurrentBrazilDate();
      year = parseInt(today.slice(0, 4));
      month = parseInt(today.slice(5, 7));
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Buscar dados
    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, targetUserId),
          gte(timeEntries.entryDate, startDate),
          lte(timeEntries.entryDate, endDate)
        )
      );

    const schedules = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.userId, targetUserId));

    const absences = await db
      .select()
      .from(serverAbsences)
      .where(
        and(
          eq(serverAbsences.userId, targetUserId),
          lte(serverAbsences.startDate, endDate),
          gte(serverAbsences.endDate, startDate)
        )
      );

    const occurrences = await db
      .select()
      .from(dayOccurrences)
      .where(
        and(
          gte(dayOccurrences.occurrenceDate, startDate),
          lte(dayOccurrences.occurrenceDate, endDate)
        )
      );

    // Criar map de schedules por weekday
    const scheduleMap = new Map<number, typeof schedules[0]>();
    schedules.forEach(s => scheduleMap.set(s.weekday, s));

    // Criar map de ocorrências por data
    const occurrenceMap = new Map<string, typeof occurrences[0]>();
    occurrences.forEach(o => occurrenceMap.set(o.occurrenceDate, o));

    let expectedMinutes = 0;
    let actualMinutes = 0;
    let workingDays = 0;
    let workedDays = 0;
    let absenceDays = 0;
    let holidayDays = 0;
    let weekendDays = 0;

    // Iterar pelos dias do mês
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dt = new Date(`${dateStr}T12:00:00-03:00`);
      const weekday = dt.getDay();
      const isWeekend = weekday === 0 || weekday === 6;

      // Verificar se é feriado ou ocorrência
      const occurrence = occurrenceMap.get(dateStr);
      if (occurrence && (occurrence.type === 'holiday' || occurrence.type === 'optional_point' || occurrence.type === 'school_recess' || occurrence.type === 'bank_withdrawal')) {
        holidayDays++;
        continue;
      }

      // Verificar se é fim de semana
      if (isWeekend && (!scheduleMap.get(weekday) || !scheduleMap.get(weekday)?.isWorkday)) {
        weekendDays++;
        continue;
      }

      // Verificar se está em período de afastamento
      const activeAbsence = absences.find(a => {
        const startStr = String(a.startDate).slice(0, 10);
        const endStr = String(a.endDate).slice(0, 10);
        return dateStr >= startStr && dateStr <= endStr;
      });
      if (activeAbsence) {
        absenceDays++;
        continue;
      }

      // Buscar horário cadastrado para este dia
      const schedule = scheduleMap.get(weekday);
      
      // ========================================================================
      // CORREÇÃO: Só bloqueia se EXISTE schedule E estiver marcado como "não trabalha"
      // Se NÃO existir schedule, considera como dia útil sem horário definido (0h esperadas)
      // ========================================================================
      if (schedule && !schedule.isWorkday) {
        weekendDays++;
        continue;
      }

      workingDays++;

      // Calcular horas esperadas (jornada diária)
      // Se não tem horário cadastrado, horas esperadas = 0
      const expectedCheckIn = schedule ? timeToMinutes(schedule.checkInTime) : 0;
      const expectedLunchOut = schedule ? timeToMinutes(schedule.lunchOutTime) : 0;
      const expectedLunchIn = schedule ? timeToMinutes(schedule.lunchInTime) : 0;
      const expectedCheckOut = schedule ? timeToMinutes(schedule.checkOutTime) : 0;

      let dayExpected = 0;
      if (schedule && expectedCheckIn && expectedCheckOut) {
        dayExpected = expectedCheckOut - expectedCheckIn;
        if (expectedLunchOut && expectedLunchIn) {
          dayExpected -= (expectedLunchIn - expectedLunchOut);
        }
      }

      expectedMinutes += dayExpected;

      // Buscar registro efetivo do dia
      const entry = entries.find(e => e.entryDate === dateStr);
      if (entry && entry.checkIn && entry.checkOut) {
        workedDays++;
        let dayActual = isoToMinutes(entry.checkOut) - isoToMinutes(entry.checkIn);
        if (entry.lunchOut && entry.lunchIn) {
          dayActual -= (isoToMinutes(entry.lunchIn) - isoToMinutes(entry.lunchOut));
        }
        if (dayActual > 0) actualMinutes += dayActual;
      }
    }

    const balanceMinutes = actualMinutes - expectedMinutes;
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .then((rows) => rows[0]);

    return NextResponse.json({
      month: { year, month, startDate, endDate, totalDays: lastDay },
      user: user ? { id: user.id, name: user.name, registration: user.registration } : null,
      summary: {
        workingDays,
        workedDays,
        absenceDays,
        holidayDays,
        weekendDays,
        expectedMinutes,
        actualMinutes,
        balanceMinutes,
        expectedFormatted: minutesToString(expectedMinutes),
        actualFormatted: minutesToString(actualMinutes),
        balanceFormatted: minutesToString(balanceMinutes),
        balanceType: balanceMinutes > 0 ? 'superavit' : balanceMinutes < 0 ? 'deficit' : 'neutro',
      },
    });
  } catch (error) {
    console.error('Erro ao calcular saldo de horas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
