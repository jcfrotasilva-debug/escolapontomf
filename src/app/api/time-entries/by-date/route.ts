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
      updatedAt: new Date().toISOString(),
    };

    // Verificar se os valores são strings vazias ou null
    const hasCheckIn = checkIn !== undefined && checkIn !== null && checkIn !== '';
    const hasLunchOut = lunchOut !== undefined && lunchOut !== null && lunchOut !== '';
    const hasLunchIn = lunchIn !== undefined && lunchIn !== null && lunchIn !== '';
    const hasCheckOut = checkOut !== undefined && checkOut !== null && checkOut !== '';

    if (hasCheckIn) {
      updateData.checkIn = timeToTimestamp(checkIn, entryDate);
    }
    if (hasLunchOut) {
      updateData.lunchOut = timeToTimestamp(lunchOut, entryDate);
    }
    if (hasLunchIn) {
      updateData.lunchIn = timeToTimestamp(lunchIn, entryDate);
    }
    if (hasCheckOut) {
      updateData.checkOut = timeToTimestamp(checkOut, entryDate);
    }

    console.log('[PATCH TIME ENTRY] Verificação de valores:', {
      hasCheckIn, hasLunchOut, hasLunchIn, hasCheckOut,
      checkIn, lunchOut, lunchIn, checkOut
    });

    // Verificar se há pelo menos um campo para atualizar
    if (!hasCheckIn && !hasLunchOut && !hasLunchIn && !hasCheckOut) {
      console.error('[PATCH TIME ENTRY ERROR] Nenhum campo para atualizar');
      return NextResponse.json(
        { error: 'Pelo menos um horário deve ser informado' },
        { status: 400 }
      );
    }

    console.log('[PATCH TIME ENTRY] Atualizando registro:', { 
      userId, 
      entryDate, 
      updateData,
      updateDataType: typeof updateData,
      updatedAtType: typeof updateData.updatedAt,
      updatedAtValue: updateData.updatedAt
    });

    // Verificar se o registro existe
    console.log('[PATCH TIME ENTRY] Buscando registro existente...');
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

    console.log('[PATCH TIME ENTRY] existingEntry:', existingEntry);

    if (!existingEntry) {
      // Se não existe, criar um novo registro
      console.log('[PATCH TIME ENTRY] Registro não existe, criando novo...');
      
      const insertValues = {
        userId: parseInt(userId, 10),
        entryDate,
        checkIn: updateData.checkIn || null,
        lunchOut: updateData.lunchOut || null,
        lunchIn: updateData.lunchIn || null,
        checkOut: updateData.checkOut || null,
      };
      
      console.log('[PATCH TIME ENTRY] Valores para inserção:', insertValues);
      
      const [newEntry] = await db
        .insert(timeEntries)
        .values(insertValues)
        .returning();

      console.log('[PATCH TIME ENTRY] Novo registro criado:', newEntry.id);

      return NextResponse.json({
        entry: newEntry,
        message: 'Registro criado com sucesso!',
        created: true,
      });
    }

    // Atualizar registro existente
    console.log('[PATCH TIME ENTRY] Atualizando registro ID:', existingEntry.id);
    
    let updated;
    try {
      const result = await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, existingEntry.id))
        .returning();
      
      updated = result[0];
      console.log('[PATCH TIME ENTRY] Registro atualizado:', updated?.id);
    } catch (updateError: any) {
      console.error('[PATCH TIME ENTRY ERROR - UPDATE]', {
        message: updateError?.message,
        stack: updateError?.stack,
        error: updateError,
        updateData,
        existingEntryId: existingEntry.id,
        timestamp: new Date().toISOString()
      });
      throw updateError;
    }

    if (!updated) {
      console.error('[PATCH TIME ENTRY ERROR] Registro não foi atualizado');
      return NextResponse.json(
        { error: 'Erro ao atualizar registro' },
        { status: 500 }
      );
    }

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
