import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Reset Seletivo (Reservas e Sincronizações) ---');
  
  try {
    // 1. Deletar Pagamentos (Dependem de Reservas)
    const pCount = await prisma.payment.deleteMany({});
    console.log(`✅ ${pCount.count} pagamentos removidos.`);

    // 2. Deletar Contratos (Dependem de Reservas)
    const cCount = await prisma.contractDraft.deleteMany({});
    console.log(`✅ ${cCount.count} rascunhos de contrato removidos.`);
    
    // 3. Deletar Reservas
    const rCount = await prisma.reservation.deleteMany({});
    console.log(`✅ ${rCount.count} reservas removidas.`);
    
    // 4. Deletar Configurações de Sincronização
    const sCount = await prisma.calendarSync.deleteMany({});
    console.log(`✅ ${sCount.count} configurações de sincronização removidas.`);
    
    console.log('\n--- Limpeza Concluída! ---');
    console.log('Usuários e Imóveis foram preservados.');
    
  } catch (error) {
    console.error('❌ Erro durante o reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
