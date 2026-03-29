import { PrismaClient } from '@prisma/client';
 
const prisma = new PrismaClient();
const email = 'diegohomero06@hotmail.com';
 
async function main() {
  console.log(`--- Desativando Tour para: ${email} ---`);
  
  const user = await prisma.user.findUnique({
    where: { email }
  });
 
  if (!user) {
    console.error(`[ERRO] Usuário ${email} não encontrado.`);
    return;
  }
 
  await prisma.user.update({
    where: { id: user.id },
    data: { has_seen_tour: true }
  });
 
  console.log(`[SUCESSO] Tour marcado como VISTO para: ${user.nome} (${email})`);
}
 
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
