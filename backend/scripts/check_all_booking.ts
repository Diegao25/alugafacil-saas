import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.reservation.findMany({
    where: { provider: 'booking' }
  });
  console.log(`Total Booking encontradas no sistema: ${bookings.length}`);
  bookings.forEach(b => {
    console.log(`ID: ${b.id}, Data: ${b.data_checkin.toISOString()}, Valor: R$ ${b.valor_total}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
