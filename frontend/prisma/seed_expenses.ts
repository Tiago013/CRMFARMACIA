import prisma from '../src/lib/prisma';

async function seedExpenses() {
  console.log('Iniciando carga de gastos de prueba...');
  
  const pharmacy = await prisma.pharmacy.findFirst();
  if (!pharmacy) {
    console.log('No se encontró farmacia. Abortando.');
    return;
  }
  
  const tenant_id = pharmacy.id;

  // 1. Crear Categorías de Gastos
  const categoriesData = [
    { name: 'Arriendo', description: 'Pago mensual de arriendo de local', color: '#6366f1' },
    { name: 'Nómina', description: 'Pago de salarios a empleados', color: '#10b981' },
    { name: 'Servicios', description: 'Agua, luz, internet', color: '#f59e0b' },
    { name: 'Marketing', description: 'Publicidad en redes y medios', color: '#ec4899' },
    { name: 'Mantenimiento', description: 'Reparaciones y limpieza', color: '#64748b' }
  ];

  const createdCategories = [];
  for (const cat of categoriesData) {
    const created = await prisma.expenseCategory.create({
      data: {
        tenant_id,
        name: cat.name,
        description: cat.description,
        color: cat.color
      }
    });
    createdCategories.push(created);
  }

  console.log(`✅ ${createdCategories.length} Categorías creadas.`);

  // 2. Crear Gastos para los últimos 3 meses
  const expensesData = [];
  const now = new Date();
  
  for (let i = 0; i < 30; i++) {
    const randomCat = createdCategories[Math.floor(Math.random() * createdCategories.length)];
    const randomDaysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
    
    // Generar monto aleatorio según categoría
    let amount = 0;
    if (randomCat.name === 'Arriendo') amount = 1500000 + Math.random() * 500000;
    else if (randomCat.name === 'Nómina') amount = 800000 + Math.random() * 1200000;
    else if (randomCat.name === 'Servicios') amount = 150000 + Math.random() * 200000;
    else amount = 50000 + Math.random() * 300000;

    expensesData.push({
      tenant_id,
      category_id: randomCat.id,
      amount: Math.round(amount),
      date,
      description: `Gasto de prueba - ${randomCat.name}`,
      reference_code: `REF-${Math.floor(Math.random() * 10000)}`,
      status: 'COMPLETED'
    });
  }

  const createdExpenses = await prisma.expense.createMany({
    data: expensesData
  });

  console.log(`✅ ${createdExpenses.count} Gastos generados.`);
  console.log('Carga completada.');
}

seedExpenses()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
