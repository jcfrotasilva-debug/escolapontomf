import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { bankOfHours, bankOfHoursConversions } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const hours = parseFloat(searchParams.get('hours') || '0');

    if (!userId || hours <= 0) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // Buscar dados do banco de horas do servidor
    const bankData = await db
      .select()
      .from(bankOfHours)
      .where(eq(bankOfHours.userId, parseInt(userId)))
      .orderBy(bankOfHours.entryDate);

    // Calcular saldo total
    const totalBalance = bankData.reduce((sum, entry) => sum + entry.balance, 0);

    if (totalBalance < hours) {
      return NextResponse.json({ 
        error: `Saldo insuficiente. Saldo disponível: ${totalBalance.toFixed(2)}h` 
      }, { status: 400 });
    }

    // Calcular dias de folga
    const daysEarned = hours / 8;

    // Registrar conversão
    await db.insert(bankOfHoursConversions).values({
      userId: parseInt(userId),
      conversionDate: new Date().toISOString().split('T')[0],
      hoursConverted: hours,
      daysEarned: daysEarned,
      type: 'used',
    });

    // Atualizar saldo no banco de horas (subtrair horas convertidas)
    let hoursToSubtract = hours;
    const updatedEntries = [];

    for (const entry of bankData) {
      if (hoursToSubtract <= 0) break;

      if (entry.balance > 0) {
        const hoursToSubtractFromEntry = Math.min(entry.balance, hoursToSubtract);
        const newBalance = entry.balance - hoursToSubtractFromEntry;
        hoursToSubtract -= hoursToSubtractFromEntry;

        await db
          .update(bankOfHours)
          .set({ balance: newBalance })
          .where(eq(bankOfHours.id, entry.id));

        updatedEntries.push(entry);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${hours}h convertidas em ${daysEarned.toFixed(2)} dias de folga`,
      hoursConverted: hours,
      daysEarned: daysEarned,
    });
  } catch (error) {
    console.error('Erro ao converter horas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
