import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n--- 🌱 Iniciando Sistema de Sementes (Seed System) ---');

  // 1. Criar Termos de Uso Iniciais (Essencial para Onboarding)
  const terms = await prisma.termsVersion.upsert({
    where: { version: '1.0' },
    update: {},
    create: {
      version: '1.0',
      title: 'Termos de Uso - Aluga Fácil',
      content: `
        Aluga Fácil
        
        Termos de Uso
        
        Este documento estabelece as regras para o uso da plataforma Aluga Fácil. Leia com atenção antes de continuar a utilizar o serviço.
        
        1. Aceitação
        Ao utilizar o Aluga Fácil, você concorda com este conjunto de regras, políticas e práticas. O uso contínuo evidencia a aceitação automática dessas condições.
        
        2. Uso autorizado
        Você pode criar e gerenciar seus imóveis, reservas e locatários. É proibido usar a plataforma para atividades ilegais, conteúdo enganoso ou violar direitos de terceiros.
        
        3. Dados e privacidade
        Os dados cadastrados — clientes, pagamentos, contratos — são armazenados com segurança. É responsabilidade do usuário manter seus acessos protegidos.
        
        4. Responsabilidades
        O sistema auxilia na gestão, mas o locador continua responsável por verificar contratos, políticas locais e comunicações com os hóspedes.
        
        5. Alterações nos termos
        Podemos ajustar estes termos a qualquer momento. Notificaremos por e-mail e o uso contínuo após a comunicação implica aceitação.
        
        Em caso de dúvidas, entre em contato pelo e-mail diegohga@gmail.com. Atualizamos estes termos periodicamente; as mudanças entram em vigor imediatamente após a publicação.
      `.trim(),
      is_active: true,
    },
  });

  console.log(`✅ Termos de Uso v${terms.version} criados com sucesso!`);
  console.log('--- 🌱 Seed Concluída: O Sistema está pronto para o Novo Usuário #1 ---\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
