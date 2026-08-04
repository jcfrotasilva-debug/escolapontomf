import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { bankOfHours, bankOfHoursConversions, timeEntries, workSchedules, users } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

// GET: Listar banco de horas de um servidor
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Servidor só vê seu próprio banco de horas
    let targetUserId = session.userId;
    if (session.role === 'hr' && userId) {
      targetUserId = parseInt(userId, 10);
    } else if (session.role === 'server' && userId && parseInt(userId, 10) !== session.userId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Buscar registros do banco de horas
    const whereConditions = [eq(bankOfHours.userId, targetUserId)];
    
    if (startDate) {
      whereConditions.push(gte(bankOfHours.entryDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(bankOfHours.entryDate, endDate));
    }

    const bankEntries = await db
      .select()
      .from(bankOfHours)
      .where(and(...whereConditions))
      .orderBy(bankOfHours.entryDate);

    // Buscar conversões em dias de folga
    const conversions = await db
      .select()
      .from(bankOfHoursConversions)
      .where(eq(bankOfHoursConversions.userId, targetUserId))
      .orderBy(bankOfHoursConversions.conversionDate);

    // Calcular saldo total
    let totalBalance = 0;
    let totalCredits = 0;
    let totalDebts = 0;

    bankEntries.forEach(entry => {
      totalBalance += entry.balance;
      if (entry.type === 'credit') {
        totalCredits += entry.balance;
      } else if (entry.type === 'debt') {
        totalDebts += Math.abs(entry.balance);
      }
    });

    // Calcular dias de folga ganhos e usados
    const daysEarned = conversions.reduce((sum, conv) => sum + conv.daysEarned, 0);
    const totalHoursConverted = conversions.reduce((sum, conv) => sum + conv.hoursConverted, 0);

    // Converter saldo atual em dias (8h = 1 dia)
    const daysFromBalance = totalBalance / 8;

    return NextResponse.json({
      entries: bankEntries,
      conversions,
      summary: {
        totalBalance,
        totalCredits,
        totalDebts,
        daysFromBalance,
        daysEarned,
        totalHoursConverted,
        status: totalBalance > 0 ? 'credit' : totalBalance < 0 ? 'debt' : 'balanced',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar banco de horas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: Calcular e atualizar banco de horas para um período
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    const targetUserId = parseInt(userId, 10);

    // Verificar se o usuário existe
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .then(rows => rows[0]);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar todos os registros de ponto do servidor
    const timeEntriesList = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, targetUserId))
      .orderBy(timeEntries.entryDate);

    // Buscar horários programados
    const schedules = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.userId, targetUserId));

    // Calcular saldo por dia
    const dailyBalances: Array<{
      entryDate: string;
      scheduledHours: number;
      workedHours: number;
      balance: number;
      type: 'credit' | 'debt' | 'neutral';
    }> = [];

    let accumulatedBalance = 0;

    for (const entry of timeEntriesList) {
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

      // Buscar horário programado para o dia da semana
      const dayOfWeek = new Date(entry.entryDate).getDay();
      const schedule = schedules.find(s => s.weekday === dayOfWeek);
      
      let scheduledHours = 8; // Padrão 8 horas
      if (schedule) {
        // Calcular horas programadas
        if (schedule.checkInTime && schedule.checkOutTime) {
          const [checkInH, checkInM] = schedule.checkInTime.split(':').map(Number);
          const [checkOutH, checkOutM] = schedule.checkOutTime.split(':').map(Number);
          
          const checkInMinutes = checkInH * 60 + checkInM;
          const checkOutMinutes = checkOutH * 60 + checkOutM;
          
          scheduledHours = (checkOutMinutes - checkInMinutes) / 60;

          // Subtrair horário de almoço
          if (schedule.lunchOutTime && schedule.lunchInTime) {
            const [lunchOutH, lunchOutM] = schedule.lunchOutTime.split(':').map(Number);
            const [lunchInH, lunchInM] = schedule.lunchInTime.split(':').map(Number);
            
            const lunchOutMinutes = lunchOutH * 60 + lunchOutM;
            const lunchInMinutes = lunchInH * 60 + lunchInM;
            
            const lunchHours = (lunchInMinutes - lunchOutMinutes) / 60;
            scheduledHours -= lunchHours;
          }
        }
      }

      const balance = workedHours - scheduledHours;
      accumulatedBalance += balance;

      dailyBalances.push({
        entryDate: entry.entryDate,
        scheduledHours,
        workedHours,
        balance,
        type: balance > 0 ? 'credit' : balance < 0 ? 'debt' : 'neutral',
      });
    }

    // Limpar registros antigos do banco de horas
    await db
      .delete(bankOfHours)
      .where(eq(bankOfHours.userId, targetUserId));

    // Inserir novos registros
    let accumulated = 0;
    for (const daily of dailyBalances) {
      accumulated += daily.balance;
      
      await db.insert(bankOfHours).values({
        userId: targetUserId,
        entryDate: daily.entryDate,
        scheduledHours: daily.scheduledHours,
        workedHours: daily.workedHours,
        balance: daily.balance,
        accumulatedBalance: accumulated,
        type: daily.type,
      });
    }

    // Buscar registros atualizados
    const updatedEntries = await db
      .select()
      .from(bankOfHours)
      .where(eq(bankOfHours.userId, targetUserId))
      .orderBy(bankOfHours.entryDate);

    return NextResponse.json({
      success: true,
      message: 'Banco de horas calculado com sucesso',
      entries: updatedEntries,
    });
  } catch (error) {
    console.error('Erro ao calcular banco de horas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Converter horas em dias de folga
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const hoursToConvert = parseFloat(searchParams.get('hours') || '0');
    const notes = searchParams.get('notes') || '';

    if (!userId || hoursToConvert <= 0) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const targetUserId = parseInt(userId, 10);

    // Verificar saldo atual
    const bankEntries = await db
      .select()
      .from(bankOfHours)
      .where(eq(bankOfHours.userId, targetUserId))
      .orderBy(bankOfHours.entryDate);

    const totalBalance = bankEntries.reduce((sum, entry) => sum + entry.balance, 0);

    if (totalBalance < hoursToConvert) {
      return NextResponse.json({ 
        error: `Saldo insuficiente. Saldo atual: ${totalBalance.toFixed(2)}h` 
      }, { status: 400 });
    }

    // Converter horas em dias (8h = 1 dia)
    const daysEarned = hoursToConvert / 8;

    // Registrar conversão
    await db.insert(bankOfHoursConversions).values({
      userId: targetUserId,
      conversionDate: getCurrentBrazilDate(),
      hoursConverted: hoursToConvert,
      daysEarned,
      type: 'used',
      notes,
    });

    // Ajustar saldo (subtrair horas convertidas)
    let remainingHours = hoursToConvert;
    
    for (const entry of bankEntries) {
      if (remainingHours <= 0) break;
      
      if (entry.balance > 0) {
        const hoursToSubtract = Math.min(entry.balance, remainingHours);
        const newBalance = entry.balance - hoursToSubtract;
        remainingHours -= hoursToSubtract;
        
        await db
          .update(bankOfHours)
          .set({ 
            balance: newBalance,
            accumulatedBalance: entry.accumulatedBalance - hoursToSubtract,
          })
          .where(eq(bankOfHours.id, entry.id));
      }
    }

    return NextResponse.json({
      success: true,
      message: `${hoursToConvert}h convertidas em ${daysEarned.toFixed(2)} dias de folga`,
      daysEarned,
    });
  } catch (error) {
    console.error('Erro ao converter horas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
