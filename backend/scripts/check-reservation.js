const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const reservation = await prisma.reservation.findFirst({
    orderBy: { data_checkin: 'desc' },
    include: { imovel: true }
  });
  console.log(JSON.stringify(reservation, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
