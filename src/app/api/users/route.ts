import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // RH pode ver todos os usuários ou filtrar por role
    const conditions = [];
    if (role) {
      conditions.push(eq(users.role, role));
    }

    const usersList = await db
      .select()
      .from(users)
      .orderBy(users.name);

    return NextResponse.json({ users: usersList });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
