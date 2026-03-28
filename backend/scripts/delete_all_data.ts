import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Limpeza Geral da Base de Dev ---');
  
  try {
    // Lista de tabelas para truncar
    // Como estamos no Postgres, podemos usar CASCADE para limpar dependências automaticamente
    const tables = [
      'Payment',
      'ContractDraft',
      'Campaign',
      'CalendarSync',
      'Reservation',
      'Property',
      'Tenant',
      'CancellationFeedback',
      'CesResponse',
      'NpsResponse',
      'SubscriptionHistory',
      'UserTermsAcceptance',
      'TermsVersion',
      'User'
    ];

    console.log(`Limpando ${tables.length} tabelas...`);

    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      console.log(`✅ Tabela ${table} limpa.`);
    }

    console.log('\n--- Limpeza Concluída com Sucesso! ---');
    console.log('O banco de dados está pronto para novos testes limpos.');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
