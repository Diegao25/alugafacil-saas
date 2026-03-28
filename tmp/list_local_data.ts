import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Buscando Dados Locais para Teste de iCal ---');
  
  const properties = await prisma.property.findMany({
    include: {
      reservas: {
        where: {
          status: { not: 'Cancelada' }
        }
      }
    }
  });

  if (properties.length === 0) {
    console.log('Nenhum imóvel encontrado no banco local.');
    return;
  }

  properties.forEach(p => {
    console.log(`\n🏠 Imóvel: ${p.nome}`);
    console.log(`🆔 ID: ${p.id}`);
    console.log(`🔗 Link iCal Local: http://localhost:3333/api/public/calendar/${p.id}/export.ics`);
    console.log(`📅 Reservas (${p.reservas.length}):`);
    
    if (p.reservas.length === 0) {
      console.log('   (Nenhuma reserva ativa encontrada)');
    } else {
      p.reservas.forEach(r => {
        const provider = r.provider || 'Manual';
        const start = r.data_checkin.toISOString().split('T')[0];
        const end = r.data_checkout.toISOString().split('T')[0];
        console.log(`   - [${provider}] ${start} a ${end} (Status: ${r.status}) | ID: ${r.id}`);
      });
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
