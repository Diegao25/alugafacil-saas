import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando pagamentos pagos sem data...');
  
  const paymentsToUpdate = await prisma.payment.findMany({
    where: {
      status: 'Pago',
      data_pagamento: null,
    },
  });

  console.log(`Encontrados ${paymentsToUpdate.length} pagamentos.`);

  for (const payment of paymentsToUpdate) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { data_pagamento: new Date() },
    });
    console.log(`Pagamento ${payment.id} atualizado.`);
  }

  console.log('Concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
