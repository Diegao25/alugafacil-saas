import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeDatabase() {
  console.log('\n--- 🧹 Iniciando Deep Wipe (Limpeza Profunda) ---');
  console.log('--- 🛡️ ALERTA: Esta ação é irreversível! ---\n');

  try {
    // 1. Limpeza de Logs e Feedbacks
    console.log('🗑️ Deletando NPS, CES e Históricos...');
    await prisma.npsResponse.deleteMany({});
    await prisma.cesResponse.deleteMany({});
    await prisma.subscriptionHistory.deleteMany({});
    await prisma.cancellationFeedback.deleteMany({});
    
    // 2. Termos e Aceites
    console.log('📜 Deletando Aceites de Termos...');
    await prisma.userTermsAcceptance.deleteMany({});
    await prisma.termsVersion.deleteMany({});

    // 3. Contratos e Pagamentos
    console.log('💳 Deletando Pagamentos e Contratos...');
    await prisma.payment.deleteMany({});
    await prisma.contractDraft.deleteMany({});

    // 4. Reservas e Sincronizações
    console.log('📅 Deletando Reservas e Sincronizações...');
    await prisma.reservation.deleteMany({});
    await prisma.calendarSync.deleteMany({});

    // 5. Campanhas, Imóveis e Locatários
    console.log('🏠 Deletando Imóveis, Campanhas e Locatários...');
    await prisma.campaign.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.tenant.deleteMany({});
    
    // 6. Usuários (A Raiz) - Resetando associações primeiro
    console.log('👤 Resetando associações de equipe...');
    await prisma.user.updateMany({
      data: { owner_user_id: null }
    });

    console.log('👤 Deletando Usuários...');
    await prisma.user.deleteMany({});

    console.log('\n--- ✨ Banco de Dados Zerado com Sucesso! ---');
    console.log('--- 🚀 Pronto para o Lançamento Oficial no .net.br ---\n');

  } catch (error) {
    console.error('\n❌ Erro durante a limpeza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

wipeDatabase();
