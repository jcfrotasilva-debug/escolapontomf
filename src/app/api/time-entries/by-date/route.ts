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

    // Converter objetos Date para strings ISO para preservar o fuso horário
    const formattedEntry = entry ? {
      ...entry,
      checkIn: entry.checkIn ? entry.checkIn.toISOString() : null,
      lunchOut: entry.lunchOut ? entry.lunchOut.toISOString() : null,
      lunchIn: entry.lunchIn ? entry.lunchIn.toISOString() : null,
      checkOut: entry.checkOut ? entry.checkOut.toISOString() : null,
    } : null;

    console.log('[GET TIME ENTRY] Entry formatada:', formattedEntry);

    return NextResponse.json({ entry: formattedEntry });
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
    const { 
      userId, 
      entryDate, 
      checkIn, 
      lunchOut, 
      lunchIn, 
      checkOut,
      partialAbsence,
      partialAbsenceType,
      partialAbsenceDuration,
      partialAbsencePeriod,
      partialAbsenceDescription
    } = body;

    if (!userId || !entryDate) {
      return NextResponse.json(
        { error: 'userId e entryDate são obrigatórios' },
        { status: 400 }
      );
    }

    // Função para converter hora (HH:MM) para objeto Date no fuso horário do Brasil
    // Cria um timestamp ISO com timezone -03:00 (Brasil)
    const timeToDate = (time: string | null, date: string): Date | null => {
      if (!time || time === 'null' || time === '') return null;
      // Formato esperado: YYYY-MM-DD e HH:MM
      // Cria um timestamp ISO com timezone do Brasil (-03:00)
      const isoString = `${date}T${time}:00-03:00`;
      return new Date(isoString);
    };

    // Preparar dados para atualização
    const updateData: Record<string, any> = {};

    // Verificar se os valores são strings vazias ou null
    const hasCheckIn = checkIn !== undefined && checkIn !== null && checkIn !== '';
    const hasLunchOut = lunchOut !== undefined && lunchOut !== null && lunchOut !== '';
    const hasLunchIn = lunchIn !== undefined && lunchIn !== null && lunchIn !== '';
    const hasCheckOut = checkOut !== undefined && checkOut !== null && checkOut !== '';

    if (hasCheckIn) {
      updateData.checkIn = timeToDate(checkIn, entryDate);
    }
    if (hasLunchOut) {
      updateData.lunchOut = timeToDate(lunchOut, entryDate);
    }
    if (hasLunchIn) {
      updateData.lunchIn = timeToDate(lunchIn, entryDate);
    }
    if (hasCheckOut) {
      updateData.checkOut = timeToDate(checkOut, entryDate);
    }

    // Registrar ausência parcial se informada
    if (partialAbsence !== undefined) {
      updateData.partialAbsence = partialAbsence;
      updateData.partialAbsenceType = partialAbsenceType || null;
      updateData.partialAbsenceDuration = partialAbsenceDuration || null;
      updateData.partialAbsencePeriod = partialAbsencePeriod || null;
      updateData.partialAbsenceDescription = partialAbsenceDescription || null;
    }

    console.log('[PATCH TIME ENTRY] Verificação de valores:', {
      hasCheckIn, hasLunchOut, hasLunchIn, hasCheckOut,
      checkIn, lunchOut, lunchIn, checkOut,
      partialAbsence
    });

    // Verificar se há pelo menos um campo para atualizar
    if (!hasCheckIn && !hasLunchOut && !hasLunchIn && !hasCheckOut && partialAbsence === undefined) {
      console.error('[PATCH TIME ENTRY ERROR] Nenhum campo para atualizar');
      return NextResponse.json(
        { error: 'Pelo menos um horário ou ausência parcial deve ser informado' },
        { status: 400 }
      );
    }

    console.log('[PATCH TIME ENTRY] Atualizando registro:', { 
      userId, 
      entryDate, 
      updateData
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
        partialAbsence: updateData.partialAbsence || false,
        partialAbsenceType: updateData.partialAbsenceType || null,
        partialAbsenceDuration: updateData.partialAbsenceDuration || null,
        partialAbsencePeriod: updateData.partialAbsencePeriod || null,
        partialAbsenceDescription: updateData.partialAbsenceDescription || null,
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
    console.log('[PATCH TIME ENTRY] updateData completo:', JSON.stringify(updateData));
    
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
        updateData: JSON.stringify(updateData),
        existingEntryId: existingEntry.id,
        errorName: updateError?.name,
        errorCode: updateError?.code
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
