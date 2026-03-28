
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const propertyId = 'ecd35409-0ff9-4c0a-bc5b-df4994223e55';
  console.log(`Checking property ${propertyId}...`);
  
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      reservas: {
        where: {
          status: { not: 'Cancelada' }
        }
      }
    }
  });

  if (!property) {
    console.log('Property not found in local database.');
    return;
  }

  console.log(`Found property: ${property.nome}`);
  console.log(`Total reservations: ${property.reservas.length}`);
  
  fs.writeFileSync('tmp/property_export_debug.json', JSON.stringify(property, null, 2));
  console.log('Saved details to tmp/property_export_debug.json');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
