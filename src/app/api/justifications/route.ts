import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { justifications, users, timeEntries } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getCurrentBrazilDate, getYesterdayBrazilDate } from '@/lib/timezone';

// Helper para logging em produção
function logError(context: string, error: any) {
  console.error(`[JUSTIFICATIONS API ERROR] ${context}:`, {
    message: error?.message,
    stack: error?.stack,
    error: error,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  try {
    console.log('[JUSTIFICATIONS GET] Iniciando listagem de justificativas');
    
    const session = await getSession();
    if (!session) {
      console.log('[JUSTIFICATIONS GET] Usuário não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.log('[JUSTIFICATIONS GET] Usuário autenticado:', { userId: session.userId, role: session.role });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    console.log('[JUSTIFICATIONS GET] Parâmetros:', { userId, status });

    // Servidor só vê suas justificativas, RH vê todas
    const whereClauses: ReturnType<typeof eq>[] = [];
    if (session.role === 'server') {
      whereClauses.push(eq(justifications.userId, session.userId));
    } else if (userId) {
      whereClauses.push(eq(justifications.userId, parseInt(userId, 10)));
    }
    if (status && status !== 'all') {
      whereClauses.push(eq(justifications.status, status));
    }

    console.log('[JUSTIFICATIONS GET] Executando query com', whereClauses.length, 'cláusulas WHERE');

    const query = db
      .select({
        id: justifications.id,
        userId: justifications.userId,
        justificationDate: justifications.justificationDate,
        reason: justifications.reason,
        status: justifications.status,
        reviewNotes: justifications.reviewNotes,
        createdAt: justifications.createdAt,
        updatedAt: justifications.updatedAt,
        userName: users.name,
        userRegistration: users.registration,
        userPosition: users.position,
      })
      .from(justifications)
      .leftJoin(users, eq(justifications.userId, users.id));

    const results = whereClauses.length > 0
      ? await query.where(and(...whereClauses)).orderBy(desc(justifications.justificationDate))
      : await query.orderBy(desc(justifications.justificationDate));

    console.log('[JUSTIFICATIONS GET] Query executada com sucesso. Resultados:', results.length);

    return NextResponse.json({ justifications: results });
  } catch (error) {
    logError('GET - Listar justificativas', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ 
      error: 'Erro interno ao listar justificativas',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('[JUSTIFICATIONS POST] Iniciando criação de justificativa');
    
    const session = await getSession();
    if (!session) {
      console.log('[JUSTIFICATIONS POST] Usuário não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    if (session.role !== 'server') {
      console.log('[JUSTIFICATIONS POST] Usuário não é servidor:', session.role);
      return NextResponse.json({ error: 'Apenas servidores podem solicitar justificativa' }, { status: 403 });
    }

    console.log('[JUSTIFICATIONS POST] Usuário autenticado:', session.userId);

    const { date, reason } = await request.json();
    console.log('[JUSTIFICATIONS POST] Dados recebidos:', { date, reason });

    if (!reason || reason.trim().length < 10) {
      console.log('[JUSTIFICATIONS POST] Motivo muito curto');
      return NextResponse.json(
        { error: 'A justificativa deve ter pelo menos 10 caracteres' },
        { status: 400 }
      );
    }

    // Normaliza a data recebida (garante formato YYYY-MM-DD)
    const normalizedDate = typeof date === 'string' ? date.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      console.log('[JUSTIFICATIONS POST] Data inválida:', date);
      return NextResponse.json(
        { error: 'Data inválida' },
        { status: 400 }
      );
    }

    console.log('[JUSTIFICATIONS POST] Data normalizada:', normalizedDate);

    // Calcula datas no fuso horário do Brasil (servidor)
    const today = getCurrentBrazilDate();
    const yesterday = getYesterdayBrazilDate();

    console.log('[JUSTIFICATIONS POST] Hoje:', today, 'Ontem:', yesterday);

    // VALIDAÇÃO RIGOROSA: só pode justificar o dia ANTERIOR (ontem no Brasil)
    if (normalizedDate !== yesterday) {
      console.log('[JUSTIFICATIONS POST] Data não é ontem');
      // Mensagens específicas para cada caso
      if (normalizedDate === today) {
        return NextResponse.json(
          { error: 'Não é possível justificar o dia atual. A justificativa só é permitida para o dia anterior.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Você só pode solicitar justificativa para o dia anterior (${yesterday}). Data enviada: ${normalizedDate}` },
        { status: 400 }
      );
    }

    console.log('[JUSTIFICATIONS POST] Verificando registros existentes...');

    // VALIDAÇÃO: não pode justificar um dia que JÁ tem registro de ponto
    // (seria contraditório: se registrou o ponto, não é ausência)
    const existingEntry = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, session.userId), eq(timeEntries.entryDate, normalizedDate)))
      .then((rows) => rows[0]);

    if (existingEntry) {
      console.log('[JUSTIFICATIONS POST] Já existe registro de ponto');
      return NextResponse.json(
        { error: 'Já existe registro de ponto para esta data. Não é possível justificar ausência em dia com registro.' },
        { status: 400 }
      );
    }

    // Verifica se já existe justificativa para essa data
    const existing = await db
      .select()
      .from(justifications)
      .where(and(eq(justifications.userId, session.userId), eq(justifications.justificationDate, normalizedDate)))
      .then((rows) => rows[0]);

    if (existing) {
      console.log('[JUSTIFICATIONS POST] Já existe justificativa para esta data');
      return NextResponse.json(
        { error: 'Já existe uma justificativa para esta data' },
        { status: 400 }
      );
    }

    console.log('[JUSTIFICATIONS POST] Inserindo justificativa no banco...');

    const [justification] = await db
      .insert(justifications)
      .values({
        userId: session.userId,
        justificationDate: normalizedDate,
        reason: reason.trim(),
      })
      .returning();

    console.log('[JUSTIFICATIONS POST] Justificativa criada com sucesso:', justification.id);

    return NextResponse.json({
      justification,
      message: `Justificativa para ${normalizedDate} enviada com sucesso! Aguardando análise do RH.`,
    });
  } catch (error) {
    logError('POST - Criar justificativa', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ 
      error: 'Erro interno ao criar justificativa',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

// RH aprova/rejeita
export async function PATCH(request: Request) {
  try {
    console.log('[JUSTIFICATIONS PATCH] Iniciando atualização de justificativa');
    
    const session = await getSession();
    if (!session) {
      console.log('[JUSTIFICATIONS PATCH] Usuário não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    if (session.role !== 'hr') {
      console.log('[JUSTIFICATIONS PATCH] Usuário não é RH:', session.role);
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id, status, reviewNotes } = await request.json();
    console.log('[JUSTIFICATIONS PATCH] Dados recebidos:', { id, status, reviewNotes });

    if (!['approved', 'rejected'].includes(status)) {
      console.log('[JUSTIFICATIONS PATCH] Status inválido:', status);
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    console.log('[JUSTIFICATIONS PATCH] Atualizando justificativa ID:', id);

    const [updated] = await db
      .update(justifications)
      .set({ status, reviewNotes: reviewNotes || null, updatedAt: new Date() })
      .where(eq(justifications.id, id))
      .returning();

    if (!updated) {
      console.log('[JUSTIFICATIONS PATCH] Justificativa não encontrada');
      return NextResponse.json({ error: 'Justificativa não encontrada' }, { status: 404 });
    }

    console.log('[JUSTIFICATIONS PATCH] Justificativa atualizada com sucesso:', updated.id, 'Status:', updated.status);

    return NextResponse.json({ justification: updated, message: 'Justificativa atualizada' });
  } catch (error) {
    logError('PATCH - Atualizar justificativa', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ 
      error: 'Erro interno ao atualizar justificativa',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
