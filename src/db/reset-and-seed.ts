import { db } from './index.js';
import { users, timeEntries, justifications, workSchedules, settings, dayOccurrences, serverAbsences, timeEntryAdjustments } from './schema.js';
import { hashPassword } from '../lib/password.js';
import { eq } from 'drizzle-orm';

async function resetAndSeed() {
  console.log('🔄 Zerando banco de dados...\n');

  try {
    // Limpar todas as tabelas na ordem correta (dependências primeiro)
    await db.delete(timeEntryAdjustments);
    console.log('✓ time_entry_adjustments limpo');
    
    await db.delete(serverAbsences);
    console.log('✓ server_absences limpo');
    
    await db.delete(dayOccurrences);
    console.log('✓ day_occurrences limpo');
    
    await db.delete(settings);
    console.log('✓ settings limpo');
    
    await db.delete(workSchedules);
    console.log('✓ work_schedules limpo');
    
    await db.delete(justifications);
    console.log('✓ justifications limpo');
    
    await db.delete(timeEntries);
    console.log('✓ time_entries limpo');
    
    await db.delete(users);
    console.log('✓ users limpo');

    console.log('\n🌱 Cadastrando usuário RH...\n');

    // Criar apenas o admin de RH
    const hrPassword = await hashPassword('admin123');
    
    const [newUser] = await db.insert(users).values({
      name: 'Administrador RH',
      email: 'rh@eemarlenefrattini.edu.br',
      password: hrPassword,
      role: 'hr',
      position: 'Gestor(a) de Recursos Humanos',
      registration: 'RH-001',
      active: true,
    }).returning();

    console.log('✅ Banco zerado e RH cadastrado com sucesso!\n');
    console.log('📋 CREDENCIAIS DE ACESSO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👔 RH (Admin):');
    console.log('   Email: rh@eemarlenefrattini.edu.br');
    console.log('   Senha: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📝 Agora você pode cadastrar os servidores pelo painel do RH!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

resetAndSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
