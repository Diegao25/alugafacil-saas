import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllReservations() {
  console.log('--- Analisando Reservas em Todas as Contas ---');

  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        imovel: {
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        },
        locatario: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        data_checkin: 'asc'
      }
    });

    if (reservations.length === 0) {
      console.log('Nenhuma reserva encontrada em nenhuma conta.');
      return;
    }

    console.log(`Total de Reservas Encontradas: ${reservations.length}\n`);

    // Agrupar por usuário
    const groupedByUser: Record<string, any[]> = {};
    reservations.forEach(res => {
      const userKey = `${res.imovel.user.nome} (${res.imovel.user.email})`;
      if (!groupedByUser[userKey]) {
        groupedByUser[userKey] = [];
      }
      groupedByUser[userKey].push(res);
    });

    for (const [user, userRes] of Object.entries(groupedByUser)) {
      console.log(`Usuário: ${user}`);
      userRes.forEach(res => {
        console.log(`  - Imóvel: ${res.imovel.nome}`);
        console.log(`    Hóspede: ${res.locatario?.nome || (res.provider ? `Bloqueio ${res.provider}` : 'N/A')}`);
        console.log(`    Período: ${res.data_checkin.toISOString().split('T')[0]} até ${res.data_checkout.toISOString().split('T')[0]}`);
        console.log(`    Status: ${res.status} | Origem: ${res.provider || 'Direto'}`);
        console.log('    -----------------------------------');
      });
      console.log('\n');
    }

  } catch (error) {
    console.error('Erro ao consultar reservas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllReservations();
