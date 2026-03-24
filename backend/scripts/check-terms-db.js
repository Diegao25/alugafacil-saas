const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const terms = await prisma.termsVersion.findMany();
    console.log('--- Terms Versions ---');
    console.log(terms);

    const active = await prisma.termsVersion.findFirst({ where: { is_active: true } });
    console.log('--- Active Version ---');
    console.log(active);

    const acceptances = await prisma.userTermsAcceptance.findMany({ take: 5 });
    console.log('--- Recent Acceptances ---');
    console.log(acceptances);

    const users = await prisma.user.count();
    console.log('--- User Count ---');
    console.log(users);

  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
