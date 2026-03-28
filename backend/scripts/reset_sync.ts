import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Limpeza de Sincronizações Travadas ---');
  
  const res = await prisma.calendarSync.updateMany({
    where: {
      status: 'syncing'
    },
    data: {
      status: 'error',
      last_error: 'Sincronização interrompida (Servidor reiniciado ou queda de conexão).'
    }
  });

  console.log(`✅ Sucesso! Destravadas ${res.count} sincronizações.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao destravar:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
