import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntries, users, workSchedules } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getCurrentBrazilDate, BRAZIL_TZ } from '@/lib/timezone';

// Função para calcular horas trabalhadas em um dia
function calculateDailyWorkedHours(entry: {
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
}): number {
  if (!entry.checkIn || !entry.checkOut) return 0;
  
  const toMinutes = (iso: string) => {
    const d = new Date(iso);
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
  };

  let mins = toMinutes(entry.checkOut) - toMinutes(entry.checkIn);
  if (entry.lunchOut && entry.lunchIn) {
    mins -= (toMinutes(entry.lunchIn) - toMinutes(entry.lunchOut));
  }
  if (mins > 0) return mins / 60;
  return 0;
}

// GET: calcular jornada diária e semanal
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const weekStartParam = searchParams.get('weekStart');

    // Servidor só pode ver sua própria jornada
    let targetUserId = session.userId;
    if (session.role === 'hr' && userIdParam) {
      targetUserId = parseInt(userIdParam, 10);
    }

    // Buscar dados do usuário
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    // Buscar jornada semanal configurada (padrão: 40h)
    const weeklyHours = user.workHours || 40;
    const dailyHours = weeklyHours / 5; // Assume 5 dias úteis

    // Calcular semana atual
    const today = getCurrentBrazilDate();
    const [year, month, day] = today.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    
    // Encontrar início da semana (segunda-feira)
    const dayOfWeek = currentDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - daysToMonday);
    
    // Se weekStartParam foi fornecido, usar ele
    let searchWeekStart = weekStart;
    if (weekStartParam) {
      const [wy, wm, wd] = weekStartParam.split('-').map(Number);
      searchWeekStart = new Date(wy, wm - 1, wd);
    }

    // Calcular fim da semana (domingo)
    const weekEnd = new Date(searchWeekStart);
    weekEnd.setDate(searchWeekStart.getDate() + 6);

    const startDate = `${searchWeekStart.getFullYear()}-${String(searchWeekStart.getMonth() + 1).padStart(2, '0')}-${String(searchWeekStart.getDate()).padStart(2, '0')}`;
    const endDate = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;

    // Buscar registros da semana
    const weekEntries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, targetUserId),
          gte(timeEntries.entryDate, startDate),
          lte(timeEntries.entryDate, endDate)
        )
      );

    // Buscar horários de trabalho
    const schedules = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.userId, targetUserId));

    // Calcular horas trabalhadas na semana
    let totalWeeklyHours = 0;
    const dailyBreakdown: Array<{
      date: string;
      weekday: number;
      weekdayName: string;
      hoursWorked: number;
      expectedHours: number;
      completed: boolean;
      hasEntry: boolean;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(searchWeekStart);
      currentDate.setDate(searchWeekStart.getDate() + i);
      
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const weekday = currentDate.getDay();
      const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      
      const entry = weekEntries.find((e) => e.entryDate === dateStr);
      const schedule = schedules.find((s) => s.weekday === weekday);
      
      const hoursWorked = entry ? calculateDailyWorkedHours({
        checkIn: entry.checkIn ? entry.checkIn.toISOString() : null,
        lunchOut: entry.lunchOut ? entry.lunchOut.toISOString() : null,
        lunchIn: entry.lunchIn ? entry.lunchIn.toISOString() : null,
        checkOut: entry.checkOut ? entry.checkOut.toISOString() : null,
      }) : 0;
      const expectedHours = schedule?.isWorkday ? dailyHours : 0;
      const completed = hoursWorked >= expectedHours;
      
      totalWeeklyHours += hoursWorked;
      
      dailyBreakdown.push({
        date: dateStr,
        weekday,
        weekdayName: weekdayNames[weekday],
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        expectedHours,
        completed,
        hasEntry: !!entry,
      });
    }

    const weeklyCompleted = totalWeeklyHours >= weeklyHours;
    const weeklyBalance = Math.round((totalWeeklyHours - weeklyHours) * 100) / 100;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        workHours: weeklyHours,
      },
      week: {
        start: startDate,
        end: endDate,
      },
      daily: {
        expectedHours: dailyHours,
      },
      weekly: {
        expectedHours: weeklyHours,
        workedHours: Math.round(totalWeeklyHours * 100) / 100,
        balance: weeklyBalance,
        completed: weeklyCompleted,
      },
      dailyBreakdown,
    });
  } catch (error) {
    console.error('Erro ao calcular jornada:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
