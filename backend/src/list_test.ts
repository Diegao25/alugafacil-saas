import { prisma } from './prisma';

async function main() {
  console.log('--- Buscando Dados Locais ---');
  try {
    const properties = await (prisma as any).property.findMany({
      include: { reservas: true }
    });

    if (properties.length === 0) {
      console.log('❌ Nenhum imóvel no banco local.');
      return;
    }

    properties.forEach((p: any) => {
      console.log(`\n🏠 ${p.nome} | ID: ${p.id}`);
      console.log(`🔗 http://localhost:3333/api/public/calendar/${p.id}/export.ics`);
      const active = p.reservas.filter((r: any) => r.status !== 'Cancelada');
      console.log(`📅 ${active.length} reservas ativas.`);
      active.forEach((r: any) => {
        console.log(`   - ${r.data_checkin.toISOString().split('T')[0]} | ${r.provider || 'Manual'}`);
      });
    });
  } catch (e: any) {
    console.error('Erro:', e.message);
  }
  process.exit(0);
}

main();
