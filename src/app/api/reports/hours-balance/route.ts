import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { bankOfHours } from '@/db/schema';
import { eq, and, gte, lte, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Servidor só pode acessar seus próprios dados
    const conditions = [eq(bankOfHours.userId, session.userId)];
    
    if (startDate) {
      conditions.push(gte(bankOfHours.entryDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(bankOfHours.entryDate, endDate));
    }

    // Buscar dados do banco de horas
    const bankDataResult = await db
      .select()
      .from(bankOfHours)
      .where(and(...conditions))
      .orderBy(asc(bankOfHours.entryDate));
    
    const bankData = bankDataResult || [];

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
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
