const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceClear() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('Nenhum usuario encontrado.');
      return;
    }

    const activeTerms = await prisma.termsVersion.findFirst({ where: { is_active: true } });
    if (!activeTerms) {
      console.log('Nenhuma versão de termos ativa encontrada.');
      return;
    }

    const result = await prisma.userTermsAcceptance.upsert({
      where: {
        usuario_id_terms_version_id: {
          usuario_id: user.id,
          terms_version_id: activeTerms.id
        }
      },
      update: {
        accepted_at: new Date()
      },
      create: {
        usuario_id: user.id,
        terms_version_id: activeTerms.id
      }
    });

    console.log('Terms forced to accepted for user:', user.email);
    console.log('Result:', result);

  } catch (error) {
    console.error('Error forcing clear:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceClear();
