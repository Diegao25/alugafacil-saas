import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Fazendo Seed dos Termos de Uso ---');
  
  try {
    const terms = await prisma.termsVersion.create({
      data: {
        version: '1.0.0',
        title: 'Termos de Uso e Política de Privacidade',
        content: '# Bem-vindo ao Aluga Fácil\n\nEstes são os termos iniciais após a limpeza da base.\n\n1. Use com responsabilidade.\n2. Seus dados estão em ambiente de desenvolvimento.',
        is_active: true
      }
    });

    console.log(`✅ Termos versão ${terms.version} criados com sucesso.`);
  } catch (error) {
    console.error('❌ Erro ao criar termos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
