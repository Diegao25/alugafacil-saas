import { prisma } from '../src/prisma';

async function main() {
  console.log('--- Diagnóstico de Sincronização iCal ---');
  
  const syncs = await (prisma as any).calendarSync.findMany({
    select: {
      id: true,
      provider: true,
      status: true,
      updated_at: true,
      last_error: true
    }
  });

  const now = Date.now();
  console.log('\nStatus das Configurações:');
  syncs.forEach((s: any) => {
    const ageSeconds = Math.floor((now - new Date(s.updated_at).getTime()) / 1000);
    console.log(`- [${s.provider.toUpperCase()}] ID: ${s.id}`);
    console.log(`  Status: ${s.status}`);
    console.log(`  Última atualização: ${ageSeconds}s atrás`);
    console.log(`  Erro: ${s.last_error || 'Nenhum'}`);
    console.log('---------------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
