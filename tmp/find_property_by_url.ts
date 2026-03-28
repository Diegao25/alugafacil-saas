import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const targetUrl = 'https://www.airbnb.com.br/calendar/ical/1649267974441596177.ics?t=1d1b891e7fa24bb29720fb8c673f2f3a';

async function findProperty() {
  try {
    const syncs = await (prisma as any).calendarSync.findMany({
      where: {
        external_url: {
          contains: '1649267974441596177'
        }
      },
      include: {
        imovel: true
      }
    });

    if (syncs.length === 0) {
      console.log('Nenhuma configuração encontrada para este link.');
      return;
    }

    for (const s of syncs) {
      console.log(`Encontrado: Imóvel ID=${s.imovel_id}, Nome=${s.imovel.nome}, Provider=${s.provider}`);
      console.log(`Última sync: ${s.last_sync}`);
    }
  } catch (error) {
    console.error('Erro ao buscar no banco:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findProperty();
