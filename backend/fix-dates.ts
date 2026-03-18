import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando reservas para normalizar datas...');
  
  const reservations = await prisma.reservation.findMany();

  console.log(`Encontradas ${reservations.length} reservas.`);

  for (const res of reservations) {
    const checkin = new Date(res.data_checkin);
    checkin.setHours(12, 0, 0, 0);
    
    const checkout = new Date(res.data_checkout);
    checkout.setHours(12, 0, 0, 0);

    await prisma.reservation.update({
      where: { id: res.id },
      data: { 
        data_checkin: checkin,
        data_checkout: checkout 
      },
    });
    console.log(`Reserva ${res.id} atualizada.`);
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
