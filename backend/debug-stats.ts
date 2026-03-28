import { prisma } from './src/prisma';

async function debug() {
  try {
    console.log('--- Iniciando Debug de Estatísticas ---');
    
    // 1. Encontrar o usuário Google
    const users = await prisma.user.findMany({
      select: { id: true, email: true, plan_name: true, subscription_status: true }
    });
    console.log('Usuários encontrados:', JSON.stringify(users, null, 2));

    const googleUser = users.find(u => u.email.toLowerCase().includes('google') || u.email.toLowerCase().includes('davi'));
    
    if (!googleUser) {
      console.log('Usuário Google não identificado nos logs acima.');
      return;
    }

    console.log('\n--- Analisando o Usuário Selecionado ---');
    console.log('ID:', googleUser.id);
    console.log('Email:', googleUser.email);
    console.log('Plano:', googleUser.plan_name);

    // 2. Verificar reservas deste mês para este usuário
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const reservations = await prisma.reservation.findMany({
      where: {
        imovel: { usuario_id: googleUser.id },
        status: { not: 'Cancelada' },
        data_checkin: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      select: { id: true, provider: true, valor_total: true, data_checkin: true }
    });

    console.log('\n--- Reservas deste Mês ---');
    console.log('Total:', reservations.length);
    console.log('Detalhes:', JSON.stringify(reservations, null, 2));

  } catch (error) {
    console.error('Erro no debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
