import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntryAdjustments, timeEntries, users } from '@/db/schema';
import { and, eq, desc, gte, lte, or } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

const VALID_FIELDS = ['checkIn', 'lunchOut', 'lunchIn', 'checkOut'];

// GET: listar retificações
// - Servidor: só suas próprias
// - RH: todas ou filtradas por userId
export async function GET(request: Request) {
  try {
    console.log('[ADJUSTMENTS GET] Iniciando listagem de retificações');
    
    const session = await getSession();
    if (!session) {
      console.log('[ADJUSTMENTS GET] Usuário não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.log('[ADJUSTMENTS GET] Usuário autenticado:', { userId: session.userId, role: session.role });

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const statusParam = searchParams.get('status');
    const monthParam = searchParams.get('month');

    console.log('[ADJUSTMENTS GET] Parâmetros:', { userIdParam, statusParam, monthParam });

    const whereClauses = [];

    // Servidor só vê suas retificações
    if (session.role === 'server') {
      whereClauses.push(eq(timeEntryAdjustments.userId, session.userId));
    } else if (userIdParam) {
      whereClauses.push(eq(timeEntryAdjustments.userId, parseInt(userIdParam, 10)));
    }

    if (statusParam && statusParam !== 'all') {
      whereClauses.push(eq(timeEntryAdjustments.status, statusParam));
    }

    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      whereClauses.push(gte(timeEntryAdjustments.entryDate, startDate));
      whereClauses.push(lte(timeEntryAdjustments.entryDate, endDate));
    }

    console.log('[ADJUSTMENTS GET] Executando query com', whereClauses.length, 'cláusulas WHERE');

    const query = db
      .select({
        id: timeEntryAdjustments.id,
        timeEntryId: timeEntryAdjustments.timeEntryId,
        entryDate: timeEntryAdjustments.entryDate,
        userId: timeEntryAdjustments.userId,
        fieldAltered: timeEntryAdjustments.fieldAltered,
        oldValue: timeEntryAdjustments.oldValue,
        newValue: timeEntryAdjustments.newValue,
        reason: timeEntryAdjustments.reason,
        adjustmentType: timeEntryAdjustments.adjustmentType,
        requestedById: timeEntryAdjustments.requestedById,
        approvedById: timeEntryAdjustments.approvedById,
        status: timeEntryAdjustments.status,
        adjustmentDate: timeEntryAdjustments.adjustmentDate,
        createdAt: timeEntryAdjustments.createdAt,
        userName: users.name,
        userRegistration: users.registration,
        userPosition: users.position,
      })
      .from(timeEntryAdjustments)
      .leftJoin(users, eq(timeEntryAdjustments.userId, users.id));

    const results = whereClauses.length > 0
      ? await query.where(and(...whereClauses)).orderBy(desc(timeEntryAdjustments.createdAt))
      : await query.orderBy(desc(timeEntryAdjustments.createdAt));

    console.log('[ADJUSTMENTS GET] Query executada com sucesso. Resultados:', results.length);

    return NextResponse.json({ adjustments: results });
  } catch (error: any) {
    console.error('[ADJUSTMENTS GET ERROR]', {
      message: error?.message,
      stack: error?.stack,
      error: error,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ 
      error: 'Erro interno ao listar retificações',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}

// POST: criar retificação (servidor solicita OU RH cria direto)
export async function POST(request: Request) {
  try {
    console.log('[ADJUSTMENTS POST] Iniciando criação de retificação');
    
    const session = await getSession();
    if (!session) {
      console.log('[ADJUSTMENTS POST] Usuário não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.log('[ADJUSTMENTS POST] Usuário autenticado:', { userId: session.userId, role: session.role });

    const body = await request.json();
    console.log('[ADJUSTMENTS POST] Dados recebidos:', body);

    const { entryDate, fieldAltered, oldValue, newValue, reason, userId, adjustmentType } = body;

    // Validações
    if (!entryDate || !fieldAltered || !reason) {
      console.log('[ADJUSTMENTS POST] Dados obrigatórios faltando');
      return NextResponse.json(
        { error: 'Data, campo e motivo são obrigatórios' },
        { status: 400 }
      );
    }

    if (!VALID_FIELDS.includes(fieldAltered)) {
      console.log('[ADJUSTMENTS POST] Campo inválido:', fieldAltered);
      return NextResponse.json(
        { error: 'Campo inválido. Deve ser: checkIn, lunchOut, lunchIn ou checkOut' },
        { status: 400 }
      );
    }

    if (reason.trim().length < 10) {
      console.log('[ADJUSTMENTS POST] Motivo muito curto');
      return NextResponse.json(
        { error: 'O motivo deve ter pelo menos 10 caracteres' },
        { status: 400 }
      );
    }

    // Validar data
    const today = getCurrentBrazilDate();
    if (entryDate > today) {
      console.log('[ADJUSTMENTS POST] Data futura não permitida');
      return NextResponse.json(
        { error: 'Não é possível solicitar retificação para data futura' },
        { status: 400 }
      );
    }

    // Servidor só pode solicitar para si mesmo
    let targetUserId = session.userId;
    if (session.role === 'server') {
      // Servidor só pode solicitar ajustes (não pode ser direto)
      const adjType = 'server_request';
    } else if (session.role === 'hr' && userId) {
      targetUserId = parseInt(userId, 10);
    }

    console.log('[ADJUSTMENTS POST] targetUserId:', targetUserId);

    // Buscar o registro do dia
    console.log('[ADJUSTMENTS POST] Buscando registro do dia...');
    const existingEntry = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.userId, targetUserId),
        eq(timeEntries.entryDate, entryDate)
      ))
      .then((rows) => rows[0]);

    console.log('[ADJUSTMENTS POST] existingEntry:', existingEntry);

    // Se não existe registro, criar um primeiro
    let timeEntryId = existingEntry?.id;
    if (!existingEntry) {
      console.log('[ADJUSTMENTS POST] Criando novo registro de ponto...');
      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          userId: targetUserId,
          entryDate,
        })
        .returning();
      timeEntryId = newEntry.id;
      console.log('[ADJUSTMENTS POST] Novo registro criado com ID:', timeEntryId);
    }

    if (!timeEntryId) {
      console.error('[ADJUSTMENTS POST] ERRO: timeEntryId é null ou undefined!');
      return NextResponse.json(
        { error: 'Erro ao criar registro de ponto' },
        { status: 500 }
      );
    }

    // Verifica se já existe solicitação pendente para este campo
    console.log('[ADJUSTMENTS POST] Verificando solicitações pendentes...');
    const existingPending = await db
      .select()
      .from(timeEntryAdjustments)
      .where(and(
        eq(timeEntryAdjustments.timeEntryId, timeEntryId),
        eq(timeEntryAdjustments.fieldAltered, fieldAltered),
        eq(timeEntryAdjustments.status, 'pending')
      ))
      .then((rows) => rows[0]);

    if (existingPending) {
      console.log('[ADJUSTMENTS POST] Já existe solicitação pendente');
      return NextResponse.json(
        { error: 'Já existe uma solicitação pendente para este campo' },
        { status: 400 }
      );
    }

    // Determinar o tipo
    let finalType = 'server_request';
    let status: 'pending' | 'approved' = 'pending';
    let approvedById: number | null = null;
    let adjustmentDate: Date | null = null;

    // Função para converter hora (HH:MM) para timestamp ISO completo
    const timeToTimestamp = (time: string, date: string): string | null => {
      if (!time || time === 'null') return null;
      // Formato esperado: YYYY-MM-DD e HH:MM
      // Retorna: YYYY-MM-DDTHH:MM:00-03:00 (fuso horário Brasil)
      return `${date}T${time}:00-03:00`;
    };

    if (session.role === 'hr' && adjustmentType === 'hr_direct') {
      console.log('[ADJUSTMENTS POST] RH fazendo correção direta');
      finalType = 'hr_direct';
      status = 'approved';
      approvedById = session.userId;
      adjustmentDate = new Date();

      // Aplicar a alteração diretamente no registro
      const updateData: Record<string, unknown> = {};
      if (newValue) {
        // Converter hora para timestamp completo
        const timestamp = timeToTimestamp(newValue, entryDate);
        updateData[fieldAltered] = timestamp;
        console.log('[ADJUSTMENTS POST] Atualizando campo:', fieldAltered, 'para:', timestamp);
      } else {
        updateData[fieldAltered] = null;
        console.log('[ADJUSTMENTS POST] Limpando campo:', fieldAltered);
      }
      updateData.updatedAt = new Date();

      console.log('[ADJUSTMENTS POST] Atualizando timeEntry ID:', timeEntryId);
      await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, timeEntryId));
      console.log('[ADJUSTMENTS POST] TimeEntry atualizado com sucesso');
    }

    // Para o insert na tabela de ajustes, salvar o timestamp completo
    const newValueTimestamp = newValue ? timeToTimestamp(newValue, entryDate) : null;
    const oldValueTimestamp = oldValue ? timeToTimestamp(oldValue, entryDate) : null;

    console.log('[ADJUSTMENTS POST] Preparando dados para inserção...');
    const insertData = {
      timeEntryId,
      entryDate,
      userId: targetUserId,
      fieldAltered,
      oldValue: oldValueTimestamp,
      newValue: newValueTimestamp,
      reason: reason.trim(),
      adjustmentType: finalType,
      requestedById: session.role === 'server' ? session.userId : null,
      approvedById,
      status,
      adjustmentDate,
    };

    console.log('[ADJUSTMENTS POST] Dados para inserção:', insertData);

    console.log('[ADJUSTMENTS POST] Inserindo retificação no banco...');
    let adjustment;
    try {
      const result = await db
        .insert(timeEntryAdjustments)
        .values(insertData)
        .returning();
      
      adjustment = result[0];
      console.log('[ADJUSTMENTS POST] Retificação criada com sucesso:', adjustment?.id);
    } catch (insertError: any) {
      console.error('[ADJUSTMENTS POST ERROR - INSERT]', {
        message: insertError?.message,
        stack: insertError?.stack,
        error: insertError,
        data: insertData,
        timestamp: new Date().toISOString()
      });
      throw insertError;
    }

    const message = session.role === 'hr' && adjustmentType === 'hr_direct'
      ? 'Retificação aplicada diretamente com sucesso!'
      : 'Solicitação de retificação enviada! Aguardando análise do RH.';

    return NextResponse.json({ adjustment, message }, { status: 201 });
  } catch (error: any) {
    console.error('[ADJUSTMENTS POST ERROR]', {
      message: error?.message,
      stack: error?.stack,
      error: error,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ 
      error: 'Erro interno ao criar retificação',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}
