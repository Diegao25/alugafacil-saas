const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Pega o ID do usuário via argumento de linha de comando
const userId = process.argv[2];

if (!userId) {
  console.error('ERRO: Você deve fornecer o ID do usuário como argumento.');
  console.log('Exemplo: node scripts/delete-user.js ce5db59e-917e-49f1-ae2e-b9af8d9c7570');
  process.exit(1);
}

async function main() {
  console.log(`--- Iniciando exclusão do usuário ${userId} ---`);

  try {
    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(`ERRO: Usuário com ID ${userId} não encontrado.`);
      return;
    }

    console.log(`Usuário encontrado: ${user.nome} (${user.email})`);

    // 1. Buscar propriedades e locatários
    const properties = await prisma.property.findMany({ where: { usuario_id: userId } });
    const tenants = await prisma.tenant.findMany({ where: { usuario_id: userId } });
    
    const propertyIds = properties.map(p => p.id);
    const tenantIds = tenants.map(t => t.id);

    console.log(`Dependências: ${properties.length} imóveis, ${tenants.length} locatários.`);

    // 2. Deletar Pagamentos e Contratos
    await prisma.payment.deleteMany({
      where: {
        reserva: {
          OR: [
            { imovel_id: { in: propertyIds } },
            { locatario_id: { in: tenantIds } }
          ]
        }
      }
    });

    await prisma.contractDraft.deleteMany({
      where: {
        reserva: {
          OR: [
            { imovel_id: { in: propertyIds } },
            { locatario_id: { in: tenantIds } }
          ]
        }
      }
    });

    // 3. Deletar Reservas
    await prisma.reservation.deleteMany({
      where: {
        OR: [
          { imovel_id: { in: propertyIds } },
          { locatario_id: { in: tenantIds } }
        ]
      }
    });

    // 4. Deletar Campanhas
    await prisma.campaign.deleteMany({
      where: {
        OR: [
          { imovel_id: { in: propertyIds } },
          { locatario_id: { in: tenantIds } }
        ]
      }
    });

    // 5. Deletar Imóveis e Locatários
    await prisma.property.deleteMany({ where: { usuario_id: userId } });
    await prisma.tenant.deleteMany({ where: { usuario_id: userId } });

    // 6. Deletar metadados
    await prisma.subscriptionHistory.deleteMany({ where: { usuario_id: userId } });
    await prisma.cancellationFeedback.deleteMany({ where: { usuario_id: userId } });
    await prisma.npsResponse.deleteMany({ where: { usuario_id: userId } });
    await prisma.cesResponse.deleteMany({ where: { usuario_id: userId } });
    await prisma.userTermsAcceptance.deleteMany({ where: { usuario_id: userId } });

    // 7. Deletar o próprio Usuário
    await prisma.user.delete({ where: { id: userId } });
    console.log(`Usuário e todas as dependências removidos com sucesso!`);

  } catch (error) {
    console.error('Erro durante a exclusão:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
