import prisma from '../src/lib/prisma';

async function analyze() {
  const pharmacy = await prisma.pharmacy.findFirst();
  const tenant_id = pharmacy.id;

  const salesAgg = await prisma.sale.aggregate({
    where: { tenant_id, status: 'COMPLETED' },
    _sum: { grand_total: true }
  });
  const totalRevenue = salesAgg._sum.grand_total || 0;

  const saleItems = await prisma.saleItem.findMany({
    where: { sale: { tenant_id, status: 'COMPLETED' } },
    include: { product: true }
  });
  
  let cogs = 0;
  for (const item of saleItems) {
    cogs += (item.quantity * Number(item.product?.cost_price || 0));
  }

  const opexAgg = await prisma.expense.aggregate({
    where: { tenant_id, status: 'COMPLETED' },
    _sum: { amount: true }
  });
  const totalOpex = opexAgg._sum.amount || 0;

  console.log("=== ANÁLISIS DE BASE DE DATOS (HISTÓRICO COMPLETO) ===");
  console.log("1. Ingresos Brutos (Ventas):", totalRevenue);
  console.log("2. Costo de Bienes Vendidos (COGS):", cogs);
  console.log("3. Gastos Operativos Reales (OPEX):", totalOpex);
  console.log("4. Utilidad Neta Real:", totalRevenue - cogs - totalOpex);
  console.log("======================================================");
}

analyze().finally(() => prisma.$disconnect());
