require('dotenv/config');

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TARGET_USER_ID = '0b493028-e1a9-4161-ada3-393356998856';
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
    console.log(`Usuario ${TARGET_USER_ID} nao encontrado.`);
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

  console.log('Resumo da exclusao planejada:');
  console.log(`- Usuario: ${user.nome} <${user.email}> (${user.id})`);
  console.log(`- Tipo: ${user.is_admin ? 'administrador' : 'usuario secundario'}`);
  console.log(`- owner_user_id atual: ${user.owner_user_id || 'null'}`);
  console.log(`- Imoveis: ${propertyIds.length}`);
  console.log(`- Locatarios: ${tenantIds.length}`);
  console.log(`- Reservas relacionadas: ${reservationsCount}`);
  console.log(`- Campanhas relacionadas: ${campaignsCount}`);
  console.log(`- Aceites de termos: ${termsAcceptances}`);
  console.log(`- Respostas NPS: ${npsResponses}`);
  console.log(`- Historico de assinatura: ${subscriptionHistory}`);
  console.log(`- Feedbacks de cancelamento: ${cancellationFeedbacks}`);
  console.log(`- Usuarios vinculados a ele como owner: ${teamMembers.length}`);

  if (teamMembers.length > 0) {
    console.log('Aviso: estes usuarios NAO serao excluidos; o owner_user_id deles sera limpo pelo banco (onDelete: SetNull).');
    for (const member of teamMembers) {
      console.log(`  - ${member.id} <${member.email}>`);
    }
  }

  if (!SHOULD_EXECUTE) {
    console.log('');
    console.log('Dry run concluido. Para executar de verdade, rode:');
    console.log('node scripts/delete-user-a90fa124.js --confirm');
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (campaignWhere.OR.length) {
      await tx.campaign.deleteMany({ where: campaignWhere });
    }

    if (reservationWhere.OR.length) {
      await tx.reservation.deleteMany({ where: reservationWhere });
    }

    if (propertyIds.length) {
      await tx.property.deleteMany({
        where: { id: { in: propertyIds } }
      });
    }

    if (tenantIds.length) {
      await tx.tenant.deleteMany({
        where: { id: { in: tenantIds } }
      });
    }

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

    await tx.user.delete({
      where: { id: TARGET_USER_ID }
    });
  });

  console.log('');
  console.log(`Usuario ${TARGET_USER_ID} e dependencias removidos com sucesso.`);
}

main()
  .catch((error) => {
    console.error('Falha ao excluir usuario:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
