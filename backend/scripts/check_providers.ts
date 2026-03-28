import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const providers = await prisma.reservation.findMany({
    distinct: ['provider'],
    select: { provider: true }
  });
  console.log('Providers encontrados:', providers);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
