require('dotenv/config');

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TARGET_USER_ID = '9b683fcd-1101-44c5-a00a-ac0cca132552';
const SHOULD_EXECUTE = process.argv.includes('--confirm');

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: TARGET_USER_ID },
    select: {
      id: true,
      nome: true,
      email: true,
      owner_user_id: true,
      is_admin: true
    }
  });

  if (!user) {
    console.log(`Usuário ${TARGET_USER_ID} não encontrado.`);
    return;
  }

  const [properties, tenants, teamMembers, termsAcceptances, npsResponses, subscriptionHistory, cancellationFeedbacks] =
    await Promise.all([
      prisma.property.findMany({
        where: { usuario_id: TARGET_USER_ID },
        select: { id: true }
      }),
      prisma.tenant.findMany({
        where: { usuario_id: TARGET_USER_ID },
        select: { id: true }
      }),
      prisma.user.findMany({
        where: { owner_user_id: TARGET_USER_ID },
        select: { id: true, email: true }
      }),
      prisma.userTermsAcceptance.count({ where: { usuario_id: TARGET_USER_ID } }),
      prisma.npsResponse.count({ where: { usuario_id: TARGET_USER_ID } }),
      prisma.subscriptionHistory.count({ where: { usuario_id: TARGET_USER_ID } }),
      prisma.cancellationFeedback.count({ where: { usuario_id: TARGET_USER_ID } })
    ]);

  const propertyIds = properties.map((item) => item.id);
  const tenantIds = tenants.map((item) => item.id);

  const reservationWhere = {
    OR: [
      propertyIds.length ? { imovel_id: { in: propertyIds } } : undefined,
      tenantIds.length ? { locatario_id: { in: tenantIds } } : undefined
    ].filter(Boolean)
  };

  const campaignWhere = {
    OR: [
      propertyIds.length ? { imovel_id: { in: propertyIds } } : undefined,
      tenantIds.length ? { locatario_id: { in: tenantIds } } : undefined
    ].filter(Boolean)
  };

  const [reservationsCount, campaignsCount] = await Promise.all([
    reservationWhere.OR.length ? prisma.reservation.count({ where: reservationWhere }) : 0,
    campaignWhere.OR.length ? prisma.campaign.count({ where: campaignWhere }) : 0
  ]);

  console.log('Resumo da exclusão planejada:');
  console.log(`- Usuário: ${user.nome} <${user.email}> (${user.id})`);
  console.log(`- Tipo: ${user.is_admin ? 'administrador' : 'usuário secundário'}`);
  console.log(`- owner_user_id atual: ${user.owner_user_id || 'null'}`);
  console.log(`- Imóveis: ${propertyIds.length}`);
  console.log(`- Locatários: ${tenantIds.length}`);
  console.log(`- Reservas relacionadas: ${reservationsCount}`);
  console.log(`- Campanhas relacionadas: ${campaignsCount}`);
  console.log(`- Aceites de termos: ${termsAcceptances}`);
  console.log(`- Respostas NPS: ${npsResponses}`);
  console.log(`- Histórico de assinatura: ${subscriptionHistory}`);
  console.log(`- Feedbacks de cancelamento: ${cancellationFeedbacks}`);
  console.log(`- Usuários vinculados a ele como owner: ${teamMembers.length}`);

  if (teamMembers.length > 0) {
    console.log('Aviso: estes usuários NÃO serão excluídos; o owner_user_id deles será limpo pelo banco (onDelete: SetNull).');
    for (const member of teamMembers) {
      console.log(`  - ${member.id} <${member.email}>`);
    }
  }

  if (!SHOULD_EXECUTE) {
    console.log('');
    console.log('Dry run concluído. Para executar de verdade, rode:');
    console.log('node scripts/delete-user-9b683fcd.js --confirm');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Apagar campanhas ligadas a imoveis ou locatarios do usuario
    if (campaignWhere.OR.length) {
      await tx.campaign.deleteMany({ where: campaignWhere });
    }

    // Apagar reservas (e cascateará pagamentos/contratos) ligadas a imoveis/locatarios do usuario
    if (reservationWhere.OR.length) {
      await tx.reservation.deleteMany({ where: reservationWhere });
    }

    // Apagar Imoveis
    if (propertyIds.length) {
      await tx.property.deleteMany({
        where: { id: { in: propertyIds } }
      });
    }

    // Apagar Locatarios
    if (tenantIds.length) {
      await tx.tenant.deleteMany({
        where: { id: { in: tenantIds } }
      });
    }

    // Apagar dados do plano e tracking
    await tx.userTermsAcceptance.deleteMany({
      where: { usuario_id: TARGET_USER_ID }
    });

    await tx.npsResponse.deleteMany({
      where: { usuario_id: TARGET_USER_ID }
    });

    await tx.subscriptionHistory.deleteMany({
      where: { usuario_id: TARGET_USER_ID }
    });

    await tx.cancellationFeedback.deleteMany({
      where: { usuario_id: TARGET_USER_ID }
    });

    // Enfim, deletar usuario alvo
    await tx.user.delete({
      where: { id: TARGET_USER_ID }
    });
  });

  console.log('');
  console.log(`Usuário ${TARGET_USER_ID} e dependências removidos com sucesso.`);
}

main()
  .catch((error) => {
    console.error('Falha ao excluir usuário:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
