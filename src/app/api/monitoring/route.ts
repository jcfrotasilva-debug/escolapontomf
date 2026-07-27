import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntries, users, serverAbsences } from '@/db/schema';
import { and, eq, gte, lte, or } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

// API específica para monitoramento - retorna todos os registros de todos os servidores ativos
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Apenas RH pode acessar este endpoint' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getCurrentBrazilDate();

    // Buscar todos os servidores ativos
    const activeServers = await db
      .select({
        id: users.id,
        name: users.name,
        position: users.position,
        registration: users.registration,
        department: users.department,
      })
      .from(users)
      .where(and(eq(users.role, 'server'), eq(users.active, true)));

    // Buscar todos os registros do dia
    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.entryDate, date));

    // Buscar todos os afastamentos que cobrem o dia
    const absences = await db
      .select()
      .from(serverAbsences)
      .where(
        and(
          lte(serverAbsences.startDate, date),
          gte(serverAbsences.endDate, date)
        )
      );

    // Mapeamento de tipos de afastamento
    const absenceTypeNames: Record<string, string> = {
      vacation: 'Férias',
      medical_leave: 'Licença Médica',
      maternity_leave: 'Licença Maternidade',
      paternity_leave: 'Licença Paternidade',
      bereavement_leave: 'Licença Nojo',
      marriage_leave: 'Licença Casamento',
      technical_orientation: 'Orientação Técnica',
      school_recess: 'Recesso Escolar',
      bank_withdrawal: 'Retirada Bancária',
      other: 'Afastamento',
    };

    // Combinar dados
    const monitoring = activeServers.map((server) => {
      const entry = entries.find((e) => e.userId === server.id);
      const absence = absences.find((a) => a.userId === server.id);
      
      return {
        ...server,
        checkIn: entry?.checkIn || null,
        lunchOut: entry?.lunchOut || null,
        lunchIn: entry?.lunchIn || null,
        checkOut: entry?.checkOut || null,
        hasAnyRecord: !!(entry?.checkIn || entry?.lunchOut || entry?.lunchIn || entry?.checkOut),
        isComplete: !!(entry?.checkIn && entry?.lunchOut && entry?.lunchIn && entry?.checkOut),
        isAbsent: !!absence,
        absenceType: absence ? (absenceTypeNames[absence.type] || 'Afastamento') : null,
        absenceStartDate: absence?.startDate || null,
        absenceEndDate: absence?.endDate || null,
      };
    });

    return NextResponse.json({ monitoring, date });
  } catch (error) {
    console.error('Erro ao buscar monitoramento:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
