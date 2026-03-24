const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, nome: true }
    });
    const acceptances = await prisma.userTermsAcceptance.findMany();
    const terms = await prisma.termsVersion.findMany();

    console.log('=== DIAGNOSTIC REPORT ===');
    console.log('USERS IN DB:', users.length);
    users.forEach(u => console.log(` - ID: ${u.id} | Email: ${u.email}`));

    console.log('\nTERM VERSIONS:', terms.length);
    terms.forEach(t => console.log(` - ID: ${t.id} | Version: ${t.version} | Active: ${t.is_active}`));

    console.log('\nACCEPTANCES:', acceptances.length);
    acceptances.forEach(a => console.log(` - UserID: ${a.usuario_id} | TermID: ${a.terms_version_id} | At: ${a.accepted_at}`));
    console.log('=========================');

  } catch (error) {
    console.error('Diagnostic failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
