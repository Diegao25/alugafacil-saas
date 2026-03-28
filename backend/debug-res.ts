import { prisma } from './src/prisma';

async function run() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'diegohga@gmail.com' }
    });

    if (!user) {
      console.log('USUARIO_NAO_ENCONTRADO');
      return;
    }

    const totalReservations = await prisma.reservation.count({
      where: { imovel: { usuario_id: user.id }, status: { not: 'Cancelada' } }
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const marchReservations = await prisma.reservation.findMany({
      where: {
        imovel: { usuario_id: user.id },
        status: { not: 'Cancelada' },
        data_checkin: { gte: monthStart, lte: monthEnd }
      }
    });

    console.log('--- RESULTADO DEBUG ---');
    console.log('USUARIO:', user.email);
    console.log('PLANO:', user.plan_name);
    console.log('STATUS_ASSINATURA:', user.subscription_status);
    console.log('TOTAL_RESERVAS_ATIVAS:', totalReservations);
    console.log('RESERVAS_ESTE_MES (MARÇO/2026):', marchReservations.length);
    
    if (marchReservations.length > 0) {
      console.log('DETALHE_MARCO:', JSON.stringify(marchReservations, null, 2));
    }

  } catch (e) {
    console.error('ERRO:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
