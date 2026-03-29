import { PrismaClient } from '@prisma/client';
 
const prisma = new PrismaClient();
const email = 'colinbean@quiet-branch.com.br';
 
async function main() {
  console.log(`--- Iniciando Reset do Tour para: ${email} ---`);
  
  const user = await prisma.user.findUnique({
    where: { email }
  });
 
  if (!user) {
    console.error(`[ERRO] Usuário ${email} não encontrado.`);
    return;
  }
 
  await prisma.user.update({
    where: { id: user.id },
    data: { has_seen_tour: false }
  });
 
  console.log(`[SUCESSO] Status 'has_seen_tour' resetado para: ${user.nome} (${email})`);
}
 
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
