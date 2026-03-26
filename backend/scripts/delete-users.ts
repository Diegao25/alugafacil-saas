import 'dotenv/config';
import { prisma } from '../src/prisma';

async function cleanupUser(userId: string) {
  console.log(`\n--- Iniciando limpeza para o usuário: ${userId} ---`);

  try {
    // 0. Verificar se o usuário existe
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log(`[Erro] Usuário ${userId} não encontrado.`);
      return;
    }
    console.log(`Usuário encontrado: ${user.nome} (${user.email})`);

    // 1. Encontrar imóveis e locatários para identificar dependências de segundo nível
    const properties = await prisma.property.findMany({ where: { usuario_id: userId } });
    const propertyIds = properties.map(p => p.id);
    
    const tenants = await prisma.tenant.findMany({ where: { usuario_id: userId } });
    const tenantIds = tenants.map(t => t.id);

    console.log(`Entidades a serem removidas: ${properties.length} imóveis, ${tenants.length} locatários.`);

    // 2. Transação para garantir atomicidade
    await prisma.$transaction(async (tx) => {
      // a. Campanhas
      const campaignCount = await tx.campaign.deleteMany({
        where: {
          OR: [
            { imovel_id: { in: propertyIds } },
            { locatario_id: { in: tenantIds } }
          ]
        }
      });
      console.log(`- ${campaignCount.count} campanhas removidas.`);

      // b. Sincronizações de Calendário
      const syncCount = await tx.calendarSync.deleteMany({
        where: { imovel_id: { in: propertyIds } }
      });
      console.log(`- ${syncCount.count} sincronizações de calendário removidas.`);

      // c. Reservas (Pagamentos e Contratos são Cascade no banco)
      const reservationCount = await tx.reservation.deleteMany({
        where: { imovel_id: { in: propertyIds } }
      });
      console.log(`- ${reservationCount.count} reservas removidas (incluindo pagamentos e contratos).`);

      // d. Imóveis
      await tx.property.deleteMany({ where: { usuario_id: userId } });
      console.log(`- ${properties.length} imóveis removidos.`);

      // e. Locatários
      await tx.tenant.deleteMany({ where: { usuario_id: userId } });
      console.log(`- ${tenants.length} locatários removidos.`);

      // f. Logs e feedbacks do sistema
      await tx.cancellationFeedback.deleteMany({ where: { usuario_id: userId } });
      await tx.cesResponse.deleteMany({ where: { usuario_id: userId } });
      await tx.npsResponse.deleteMany({ where: { usuario_id: userId } });
      await tx.subscriptionHistory.deleteMany({ where: { usuario_id: userId } });
      console.log(`- Logs de feedback e histórico limpos.`);

      // g. Membros da equipe (se este usuário for dono de outros)
      const teamCount = await tx.user.deleteMany({ where: { owner_user_id: userId } });
      console.log(`- ${teamCount.count} membros da equipe removidos.`);

      // h. Finalmente o usuário
      await tx.user.delete({ where: { id: userId } });
      console.log(`[Sucesso] Usuário ${userId} removido completamente.`);
    });

  } catch (error) {
    console.error(`[Erro Crítico] Falha ao limpar usuário ${userId}:`, error);
  }
}

async function main() {
  const idsToDelete = [
    '9d344580-930c-41de-a009-3573604f4129',
    '51b4ef97-bd44-44f4-baac-56b52bc6a3ae'
  ];

  for (const id of idsToDelete) {
    await cleanupUser(id);
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
