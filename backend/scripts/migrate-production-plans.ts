import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Migração de Planos (Produção) ---');

  // 1. Atualizar usuários Trial para Básico
  const trialUpdate = await prisma.user.updateMany({
    where: {
      OR: [
        { plan_type: 'trial' },
        { plan_name: 'trial' }
      ]
    },
    data: {
      plan_type: 'basico',
      plan_name: 'Plano Básico'
    }
  });
  console.log(`✅ ${trialUpdate.count} usuários Trial convertidos para Básico.`);

  // 2. Atualizar usuários Pro para Completo
  const proUpdate = await prisma.user.updateMany({
    where: {
      OR: [
        { plan_type: 'pro' },
        { plan_name: 'Plano Completo' }
      ]
    },
    data: {
      plan_type: 'completo',
      plan_name: 'Plano Completo'
    }
  });
  console.log(`✅ ${proUpdate.count} usuários Pro convertidos para Completo.`);

  // 3. Garantir que usuários ativos tenham os nomes comerciais certos
  const activeUpdate = await prisma.user.updateMany({
    where: {
      subscription_status: 'active_subscription',
      plan_name: { not: 'Plano Completo' }
    },
    data: {
      plan_name: 'Plano Completo',
      plan_type: 'completo'
    }
  });
  console.log(`✅ ${activeUpdate.count} assinaturas ativas garantidas como Plano Completo.`);

  console.log('--- Migração Concluída com Sucesso! ---');
}

main()
  .catch((e) => {
    console.error('Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
