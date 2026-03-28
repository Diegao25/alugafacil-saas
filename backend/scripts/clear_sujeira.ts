import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearSujeira() {
  console.log('--- Limpando "sujeira" (Reservas e Sincronizações) ---');

  try {
    // 1. Deletar dependências de reservas (Pagamentos e Contratos)
    const pCount = await prisma.payment.deleteMany({});
    const cCount = await prisma.contractDraft.deleteMany({});
    
    // 2. Deletar Reservas
    const rCount = await prisma.reservation.deleteMany({});
    
    // 3. Deletar Configurações de Sincronização
    const sCount = await (prisma as any).calendarSync.deleteMany({});

    console.log(`Removidos:`);
    console.log(` - ${pCount.count} Pagamentos`);
    console.log(` - ${cCount.count} Contratos`);
    console.log(` - ${rCount.count} Reservas`);
    console.log(` - ${sCount.count} Configurações de Sincronização`);

    console.log('\n✅ Base de dados local limpa com sucesso!');
  } catch (error) {
    console.error('Erro ao limpar a base:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearSujeira();
