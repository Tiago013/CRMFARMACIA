import prisma from './src/lib/prisma';

async function main() {
  const pharmacy = await prisma.pharmacy.findFirst();
  if (!pharmacy) {
    console.error('No pharmacy found!');
    return;
  }

  const tenant_id = pharmacy.id;

  const categoryNames = [
    'Analgésicos y Antipiréticos',
    'Antibióticos',
    'Antiácidos y Digestivos',
    'Antihistamínicos y Antialérgicos',
    'Vitaminas y Suplementos',
    'Cuidado Personal',
    'Primeros Auxilios',
    'Dermatología',
    'Cardiovascular',
    'Oftalmológicos',
    'Respiratorios',
    'Salud Sexual',
    'Cuidado Infantil'
  ];

  console.log('Seeding categories...');
  const categoryMap: Record<string, string> = {};

  for (const name of categoryNames) {
    let cat = await prisma.category.findFirst({
      where: { name, tenant_id }
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name, tenant_id }
      });
    }
    categoryMap[name] = cat.id;
  }

  console.log('Categories created. Assigning to products...');

  const products = await prisma.product.findMany({ where: { tenant_id } });

  let updatedCount = 0;
  for (const p of products) {
    let assignedCategoryId = null;

    const brand = p.brand_name.toLowerCase();
    const active = (p.active_ingredient || '').toLowerCase();
    const combined = brand + ' ' + active;

    if (combined.includes('acetaminofén') || combined.includes('ibuprofeno') || combined.includes('diclofenaco') || combined.includes('dolex') || combined.includes('advil') || combined.includes('sevedol') || combined.includes('voltaren')) {
      assignedCategoryId = categoryMap['Analgésicos y Antipiréticos'];
    } else if (combined.includes('loratadina') || combined.includes('cetirizina') || combined.includes('noxpirin')) {
      assignedCategoryId = categoryMap['Antihistamínicos y Antialérgicos'];
    } else if (combined.includes('omeprazol') || combined.includes('esomeprazol') || combined.includes('gaviscon') || combined.includes('buscapina') || combined.includes('smecta') || combined.includes('enterogermina')) {
      assignedCategoryId = categoryMap['Antiácidos y Digestivos'];
    } else if (combined.includes('vitamina') || combined.includes('ensure') || combined.includes('cebión')) {
      assignedCategoryId = categoryMap['Vitaminas y Suplementos'];
    } else if (combined.includes('losartán') || combined.includes('amlodipino')) {
      assignedCategoryId = categoryMap['Cardiovascular'];
    } else if (combined.includes('metformina')) {
      assignedCategoryId = categoryMap['Cardiovascular']; // close enough or create endocrinology
    } else if (combined.includes('azitromicina') || combined.includes('amoxicilina')) {
      assignedCategoryId = categoryMap['Antibióticos'];
    } else if (combined.includes('lágrimas') || combined.includes('systane')) {
      assignedCategoryId = categoryMap['Oftalmológicos'];
    } else if (combined.includes('salbutamol')) {
      assignedCategoryId = categoryMap['Respiratorios'];
    } else if (combined.includes('pedialyte')) {
      assignedCategoryId = categoryMap['Cuidado Infantil']; // or primeros auxilios
    } else if (combined.includes('sildenafil')) {
      assignedCategoryId = categoryMap['Salud Sexual'];
    }

    if (assignedCategoryId) {
      await prisma.product.update({
        where: { id: p.id },
        data: { category_id: assignedCategoryId }
      });
      updatedCount++;
    } else {
        // Fallback random or unassigned
        await prisma.product.update({
            where: { id: p.id },
            data: { category_id: categoryMap['Primeros Auxilios'] }
        });
        updatedCount++;
    }
  }

  console.log(`Successfully assigned categories to ${updatedCount} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
