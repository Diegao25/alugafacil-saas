import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const userId = '05ac0c63-7453-4a7c-8348-2f1e99a06149';

async function cleanup() {
  console.log(`[Cleaner] Buscando usuário: ${userId}`);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        imoveis: true,
        locatarios: true
      }
    });

    if (!user) {
      console.log('[Cleaner] Usuário não encontrado no banco de dados.');
      return;
    }

    console.log(`[Cleaner] Removendo dados de: ${user.nome} (${user.email})`);

    await prisma.$transaction(async (tx) => {
      // 1. Pegar IDs de imóveis e locatários
      const propertyIds = user.imoveis.map(p => p.id);
      const tenantIds = user.locatarios.map(t => t.id);

      // 2. Dependências de Reservas (Pagamentos e Contratos)
      console.log(' - Removendo Pagamentos e Contratos...');
      await tx.payment.deleteMany({
        where: { reserva: { imovel_id: { in: propertyIds } } }
      });
      await tx.contractDraft.deleteMany({
        where: { reserva: { imovel_id: { in: propertyIds } } }
      });

      // 3. Sincronização, Campanhas e Reservas
      console.log(' - Removendo Sincronizações, Campanhas e Reservas...');
      await tx.calendarSync.deleteMany({
        where: { imovel_id: { in: propertyIds } }
      });
      await tx.campaign.deleteMany({
        where: { imovel_id: { in: propertyIds } }
      });
      await tx.reservation.deleteMany({
        where: { imovel_id: { in: propertyIds } }
      });
      // Também deletar reservas ligadas aos locatários
      await tx.reservation.deleteMany({
        where: { locatario_id: { in: tenantIds } }
      });

      // 4. Imóveis e Locatários
      console.log(' - Removendo Imóveis e Locatários...');
      await tx.property.deleteMany({ where: { usuario_id: userId } });
      await tx.tenant.deleteMany({ where: { usuario_id: userId } });

      // 5. Estatísticas e Feedbacks do Usuário
      console.log(' - Removendo Feedbacks, Stats e Histórico...');
      await tx.npsResponse.deleteMany({ where: { usuario_id: userId } });
      await tx.cesResponse.deleteMany({ where: { usuario_id: userId } });
      await tx.cancellationFeedback.deleteMany({ where: { usuario_id: userId } });
      await tx.subscriptionHistory.deleteMany({ where: { usuario_id: userId } });
      await tx.userTermsAcceptance.deleteMany({ where: { usuario_id: userId } });

      // 6. Finalmente, o Usuário
      console.log(' - Removendo o Usuário...');
      await tx.user.delete({ where: { id: userId } });
    });

    console.log('[Cleaner] ✅ Exclusão completa concluída com sucesso!');
  } catch (error) {
    console.error('[Cleaner] ❌ Erro crítico durante a limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
