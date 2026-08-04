import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { bankOfHours, users } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Buscar dados do banco de horas do servidor
    const conditions = [eq(bankOfHours.userId, parseInt(userId))];
    
    if (startDate) {
      conditions.push(gte(bankOfHours.entryDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(bankOfHours.entryDate, endDate));
    }

    const bankData = await db
      .select()
      .from(bankOfHours)
      .where(and(...conditions))
      .orderBy(bankOfHours.entryDate);

    // Calcular totais
    const totalCredits = bankData
      .filter(entry => entry.balance > 0)
      .reduce((sum, entry) => sum + entry.balance, 0);

    const totalDebts = bankData
      .filter(entry => entry.balance < 0)
      .reduce((sum, entry) => sum + Math.abs(entry.balance), 0);

    const totalBalance = totalCredits - totalDebts;
    const daysFromBalance = totalBalance > 0 ? totalBalance / 8 : 0;

    return NextResponse.json({
      summary: {
        totalBalance,
        totalCredits,
        totalDebts,
        daysFromBalance,
      },
      entries: bankData,
    });
  } catch (error) {
    console.error('Erro ao buscar banco de horas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
