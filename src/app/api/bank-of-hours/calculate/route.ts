import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { bankOfHours, timeEntries, workSchedules, users, justifications, partialAbsenceJustifications } from '@/db/schema';
import { eq, and, gte, lte, asc } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // RH pode calcular para qualquer servidor
    // Servidor só pode calcular para si mesmo
    let targetUserId = session.userId;
    if (session.role === 'hr' && userId) {
      targetUserId = parseInt(userId, 10);
    } else if (session.role === 'server' && userId && parseInt(userId, 10) !== session.userId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate e endDate são obrigatórios' }, { status: 400 });
    }

    // Buscar dados do servidor
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId));
    
    const user = userResult[0];

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Jornada semanal do servidor (padrão 40h)
    const weeklyHours = user.workHours || 40;
    // Horas diárias médias (considerando 5 dias úteis)
    const dailyHours = weeklyHours / 5;

    // Buscar registros de ponto do período
    const entriesResult = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, targetUserId),
          gte(timeEntries.entryDate, startDate),
          lte(timeEntries.entryDate, endDate)
        )
      )
      .orderBy(asc(timeEntries.entryDate));
    const entries = entriesResult || [];

    // Buscar justificativas aprovadas do período
    const justificationsResult = await db
      .select()
      .from(justifications)
      .where(
        and(
          eq(justifications.userId, targetUserId),
          eq(justifications.status, 'approved'),
          gte(justifications.justificationDate, startDate),
          lte(justifications.justificationDate, endDate)
        )
      );
    const approvedJustifications = new Set(justificationsResult.map(j => j.justificationDate));

    // Buscar ausências parciais justificadas
    const partialAbsencesResult = await db
      .select()
      .from(partialAbsenceJustifications)
      .where(
        and(
          eq(partialAbsenceJustifications.userId, targetUserId),
          gte(partialAbsenceJustifications.entryDate, startDate),
          lte(partialAbsenceJustifications.entryDate, endDate)
        )
      );
    
    const partialAbsences = new Map();
    if (partialAbsencesResult && partialAbsencesResult.length > 0) {
      partialAbsencesResult.forEach(row => {
        // Parsear "2h", "1h30min", etc
        const missingHours = row.missingHours || '0h';
        const hoursMatch = missingHours.match(/(\d+)h/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const minutesMatch = missingHours.match(/(\d+)min/);
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
        const totalHours = hours + (minutes / 60);
        partialAbsences.set(row.entryDate, totalHours);
      });
    }

    // Buscar horários programados
    const schedulesResult = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.userId, targetUserId));
    const schedules = schedulesResult || [];

    // Calcular banco de horas dia a dia
    const dailyBalances: Array<{
      entryDate: string;
      scheduledHours: number;
      workedHours: number;
      balance: number;
      accumulatedBalance: number;
      type: 'credit' | 'debt' | 'neutral';
      notes: string;
    }> = [];

    let accumulatedBalance = 0;

    // Processar cada dia do período
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
      
      // Verificar se é dia útil
      const schedule = schedules.find(s => s.weekday === dayOfWeek && s.isWorkday);
      if (!schedule) {
        continue; // Não é dia útil
      }

      // Verificar se tem justificativa aprovada
      if (approvedJustifications.has(dateStr)) {
        dailyBalances.push({
          entryDate: dateStr,
          scheduledHours: dailyHours,
          workedHours: dailyHours,
          balance: 0,
          accumulatedBalance: accumulatedBalance,
          type: 'neutral',
          notes: 'Justificativa aprovada'
        });
        continue;
      }

      // Buscar registro de ponto do dia
      const entry = entries.find(e => e.entryDate === dateStr);

      if (!entry) {
        // Sem registro - débito completo
        accumulatedBalance -= dailyHours;
        dailyBalances.push({
          entryDate: dateStr,
          scheduledHours: dailyHours,
          workedHours: 0,
          balance: -dailyHours,
          accumulatedBalance: accumulatedBalance,
          type: 'debt',
          notes: 'Sem registro'
        });
        continue;
      }

      // Calcular horas trabalhadas
      let workedHours = 0;
      
      if (entry.checkIn && entry.checkOut) {
        const checkIn = new Date(entry.checkIn);
        const checkOut = new Date(entry.checkOut);
        const diffMs = checkOut.getTime() - checkIn.getTime();
        workedHours = diffMs / (1000 * 60 * 60);

        // Subtrair horário de almoço se houver
        if (entry.lunchOut && entry.lunchIn) {
          const lunchOut = new Date(entry.lunchOut);
          const lunchIn = new Date(entry.lunchIn);
          const lunchDiffMs = lunchIn.getTime() - lunchOut.getTime();
          const lunchHours = lunchDiffMs / (1000 * 60 * 60);
          workedHours -= lunchHours;
        }
      }

      // Verificar se tem ausência parcial justificada
      const partialAbsenceHours = partialAbsences.get(dateStr) || 0;
      workedHours += partialAbsenceHours;

      // Calcular saldo do dia
      const balance = workedHours - dailyHours;
      accumulatedBalance += balance;

      dailyBalances.push({
        entryDate: dateStr,
        scheduledHours: dailyHours,
        workedHours: Math.max(0, workedHours),
        balance: balance,
        accumulatedBalance: accumulatedBalance,
        type: balance > 0 ? 'credit' : balance < 0 ? 'debt' : 'neutral',
        notes: partialAbsenceHours > 0 ? `Ausência parcial justificada: ${partialAbsenceHours}h` : ''
      });
    }

    // Limpar registros antigos do período
    await db
      .delete(bankOfHours)
      .where(
        and(
          eq(bankOfHours.userId, targetUserId),
          gte(bankOfHours.entryDate, startDate),
          lte(bankOfHours.entryDate, endDate)
        )
      );

    // Inserir novos registros
    for (const daily of dailyBalances) {
      await db.insert(bankOfHours).values({
        userId: targetUserId,
        entryDate: daily.entryDate,
        scheduledHours: daily.scheduledHours,
        workedHours: daily.workedHours,
        balance: daily.balance,
        accumulatedBalance: daily.accumulatedBalance,
        type: daily.type,
        notes: daily.notes || null,
      });
    }

    // Calcular totais
    const totalCredits = dailyBalances
      .filter(d => d.balance > 0)
      .reduce((sum, d) => sum + d.balance, 0);

    const totalDebts = dailyBalances
      .filter(d => d.balance < 0)
      .reduce((sum, d) => sum + Math.abs(d.balance), 0);

    const totalBalance = totalCredits - totalDebts;
    const daysFromBalance = totalBalance > 0 ? totalBalance / dailyHours : 0;

    return NextResponse.json({
      success: true,
      message: `Banco de horas calculado para ${dailyBalances.length} dias`,
      summary: {
        totalBalance,
        totalCredits,
        totalDebts,
        daysFromBalance,
        dailyHours,
        weeklyHours,
      },
      entries: dailyBalances,
    });
  } catch (error) {
    console.error('Erro ao calcular banco de horas:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
