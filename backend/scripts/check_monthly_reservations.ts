import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  
  const reservations = await prisma.reservation.findMany({
    where: {
      data_checkin: {
        gte: monthStart,
        lte: monthEnd
      }
    },
    select: {
      id: true,
      data_checkin: true,
      provider: true,
      valor_total: true
    }
  });
  
  console.log('Reservas do mês:', reservations);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
