import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntries } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// GET: buscar registro de um servidor em uma data específica
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Apenas RH pode acessar' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId || !date) {
      return NextResponse.json(
        { error: 'userId e date são obrigatórios' },
        { status: 400 }
      );
    }

    const entry = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, parseInt(userId, 10)),
          eq(timeEntries.entryDate, date)
        )
      )
      .then((rows) => rows[0]);

    return NextResponse.json({ entry: entry || null });
  } catch (error: any) {
    console.error('[GET TIME ENTRY ERROR]', {
      message: error?.message,
      stack: error?.stack,
      error: error
    });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH: atualizar registro de um servidor em uma data específica
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Apenas RH pode acessar' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, entryDate, checkIn, lunchOut, lunchIn, checkOut } = body;

    if (!userId || !entryDate) {
      return NextResponse.json(
        { error: 'userId e entryDate são obrigatórios' },
        { status: 400 }
      );
    }

    // Função para converter hora (HH:MM) para timestamp ISO completo
    const timeToTimestamp = (time: string | null, date: string): string | null => {
      if (!time || time === 'null' || time === '') return null;
      // Formato esperado: YYYY-MM-DD e HH:MM
      // Retorna: YYYY-MM-DDTHH:MM:00-03:00 (fuso horário Brasil)
      return `${date}T${time}:00-03:00`;
    };

    // Preparar dados para atualização
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (checkIn !== undefined) {
      updateData.checkIn = timeToTimestamp(checkIn, entryDate);
    }
    if (lunchOut !== undefined) {
      updateData.lunchOut = timeToTimestamp(lunchOut, entryDate);
    }
    if (lunchIn !== undefined) {
      updateData.lunchIn = timeToTimestamp(lunchIn, entryDate);
    }
    if (checkOut !== undefined) {
      updateData.checkOut = timeToTimestamp(checkOut, entryDate);
    }

    console.log('[PATCH TIME ENTRY] Atualizando registro:', { userId, entryDate, updateData });

    // Verificar se o registro existe
    const existingEntry = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, parseInt(userId, 10)),
          eq(timeEntries.entryDate, entryDate)
        )
      )
      .then((rows) => rows[0]);

    if (!existingEntry) {
      // Se não existe, criar um novo registro
      console.log('[PATCH TIME ENTRY] Registro não existe, criando novo...');
      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          userId: parseInt(userId, 10),
          entryDate,
          checkIn: updateData.checkIn,
          lunchOut: updateData.lunchOut,
          lunchIn: updateData.lunchIn,
          checkOut: updateData.checkOut,
        })
        .returning();

      console.log('[PATCH TIME ENTRY] Novo registro criado:', newEntry.id);

      return NextResponse.json({
        entry: newEntry,
        message: 'Registro criado com sucesso!',
        created: true,
      });
    }

    // Atualizar registro existente
    const [updated] = await db
      .update(timeEntries)
      .set(updateData)
      .where(eq(timeEntries.id, existingEntry.id))
      .returning();

    console.log('[PATCH TIME ENTRY] Registro atualizado:', updated.id);

    return NextResponse.json({
      entry: updated,
      message: 'Registro atualizado com sucesso!',
      created: false,
    });
  } catch (error: any) {
    console.error('[PATCH TIME ENTRY ERROR]', {
      message: error?.message,
      stack: error?.stack,
      error: error
    });
    return NextResponse.json(
      { error: 'Erro interno ao atualizar registro' },
      { status: 500 }
    );
  }
}
