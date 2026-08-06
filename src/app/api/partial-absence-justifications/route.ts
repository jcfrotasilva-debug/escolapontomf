import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { partialAbsenceJustifications, timeEntries, users } from '@/db/schema';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

// GET: listar justificativas de ausências parciais
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Apenas RH pode acessar' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');

    let whereClauses = [];

    if (userId) {
      whereClauses.push(eq(partialAbsenceJustifications.userId, parseInt(userId, 10)));
    }

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      whereClauses.push(gte(partialAbsenceJustifications.entryDate, startDate));
      whereClauses.push(lte(partialAbsenceJustifications.entryDate, endDate));
    }

    const query = db
      .select({
        id: partialAbsenceJustifications.id,
        timeEntryId: partialAbsenceJustifications.timeEntryId,
        userId: partialAbsenceJustifications.userId,
        entryDate: partialAbsenceJustifications.entryDate,
        missingHours: partialAbsenceJustifications.missingHours,
        justificationType: partialAbsenceJustifications.justificationType,
        justificationDescription: partialAbsenceJustifications.justificationDescription,
        documentRef: partialAbsenceJustifications.documentRef,
        justifiedById: partialAbsenceJustifications.justifiedById,
        justifiedDate: partialAbsenceJustifications.justifiedDate,
        isNonDiscountable: partialAbsenceJustifications.isNonDiscountable,
        createdAt: partialAbsenceJustifications.createdAt,
        updatedAt: partialAbsenceJustifications.updatedAt,
        userName: users.name,
        userRegistration: users.registration,
      })
      .from(partialAbsenceJustifications)
      .leftJoin(users, eq(partialAbsenceJustifications.userId, users.id));

    const results = whereClauses.length > 0
      ? await query.where(and(...whereClauses)).orderBy(desc(partialAbsenceJustifications.entryDate))
      : await query.orderBy(desc(partialAbsenceJustifications.entryDate));

    return NextResponse.json({ justifications: results });
  } catch (error) {
    console.error('Erro ao listar justificativas:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST: criar justificativa de ausência parcial
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Apenas RH pode acessar' }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      entryDate,
      missingHours,
      justificationType,
      justificationDescription,
      documentRef,
      isNonDiscountable,
    } = body;

    // Validações
    if (!userId || !entryDate || !missingHours || !justificationType || !justificationDescription) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    const validTypes = ['medical', 'personal', 'family', 'other'];
    if (!validTypes.includes(justificationType)) {
      return NextResponse.json(
        { error: 'Tipo de justificativa inválido' },
        { status: 400 }
      );
    }

    // Buscar o timeEntryId baseado em userId e entryDate
    const timeEntryResult = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, parseInt(userId, 10)),
          eq(timeEntries.entryDate, entryDate)
        )
      );

    let timeEntryId: number;
    if (timeEntryResult && timeEntryResult.length > 0) {
      timeEntryId = timeEntryResult[0].id;
    } else {
      // Se não existir, criar um registro
      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          userId: parseInt(userId, 10),
          entryDate,
          status: 'pending',
        })
        .returning();
      timeEntryId = newEntry.id;
    }

    // Criar justificativa
    const [justification] = await db
      .insert(partialAbsenceJustifications)
      .values({
        timeEntryId,
        userId,
        entryDate,
        missingHours,
        justificationType,
        justificationDescription,
        documentRef: documentRef || null,
        justifiedById: session.userId,
        isNonDiscountable: isNonDiscountable !== undefined ? isNonDiscountable : true,
      })
      .returning();

    // Atualizar o registro de ponto para indicar que há justificativa
    await db
      .update(timeEntries)
      .set({
        partialAbsence: true,
        notes: `Justificado pelo RH: ${missingHours} faltantes - ${justificationDescription}`,
      })
      .where(eq(timeEntries.id, timeEntryId));

    return NextResponse.json({
      justification,
      message: 'Justificativa criada com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao criar justificativa:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// DELETE: remover justificativa
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Apenas RH pode acessar' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await db.delete(partialAbsenceJustifications).where(eq(partialAbsenceJustifications.id, parseInt(id, 10)));

    return NextResponse.json({ message: 'Justificativa removida!' });
  } catch (error) {
    console.error('Erro ao remover justificativa:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
