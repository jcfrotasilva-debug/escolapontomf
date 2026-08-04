import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { bankOfHours } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar dados do banco de horas do servidor
    const bankData = await db
      .select()
      .from(bankOfHours)
      .where(eq(bankOfHours.userId, session.userId))
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
