import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando limpeza completa do banco de dados ---');
  
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "Campaign",
        "CancellationFeedback",
        "ContractDraft",
        "NpsResponse",
        "Payment",
        "Reservation",
        "Property",
        "SubscriptionHistory",
        "Tenant",
        "UserTermsAcceptance",
        "TermsVersion",
        "User"
      RESTART IDENTITY CASCADE;
    `);
    
    console.log('✅ Banco de dados resetado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao resetar o banco:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
