import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando reservas para normalizar datas (FIX DEFINITIVO)...');
  
  const reservations = await prisma.reservation.findMany();

  console.log(`Encontradas ${reservations.length} reservas.`);

  for (const res of reservations) {
    // Pegar apenas a parte da data YYYY-MM-DD
    const dateStrIn = res.data_checkin.toISOString().split('T')[0];
    const dateStrOut = res.data_checkout.toISOString().split('T')[0];
    
    // Recriar como UTC 12:00:00 garantido
    const checkin = new Date(dateStrIn + 'T12:00:00Z');
    const checkout = new Date(dateStrOut + 'T12:00:00Z');

    await prisma.reservation.update({
      where: { id: res.id },
      data: { 
        data_checkin: checkin,
        data_checkout: checkout 
      },
    });
    console.log(`Reserva ${res.id} atualizada para ${dateStrIn} e ${dateStrOut} (12:00 UTC).`);
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
