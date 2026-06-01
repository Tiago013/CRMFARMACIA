const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pharmacy = await prisma.pharmacy.findFirst();
  const tenant_id = pharmacy.id;
  
  const supplier = await prisma.supplier.findFirst({ where: { tenant_id } });
  const product = await prisma.product.findFirst({ where: { tenant_id } });
  let category = await prisma.expenseCategory.findFirst({ where: { tenant_id, name: 'Compras de Inventario' } });
  
  if (!category) {
      category = await prisma.expenseCategory.create({
        data: {
          tenant_id,
          name: 'Compras de Inventario',
          description: 'Costo de mercadería vendida (COGS) y reabastecimiento',
          color: '#10B981' // Emerald
        }
      });
  }

  console.log("Tenant:", tenant_id);
  console.log("Supplier:", supplier?.id);
  console.log("Product:", product?.id);
  console.log("Category:", category?.id);
  
  try {
    const p = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          tenant_id,
          supplier_id: supplier.id,
          user_id: "test-user-id",
          invoice_number: "TEST-123",
          total_amount: 100,
          status: 'COMPLETED',
        }
      });
      console.log("Purchase created:", p.id);

      await tx.purchaseItem.create({
        data: {
          purchase_id: p.id,
          product_id: product.id,
          batch_number: "LOTE-123",
          expiration_date: new Date(),
          quantity: 10,
          unit_cost: 10,
          total_cost: 100
        }
      });
      console.log("PurchaseItem created");

      const batch = await tx.batch.create({
        data: {
          tenant_id,
          product_id: product.id,
          batch_number: "LOTE-123",
          expiration_date: new Date(),
          quantity: 10
        }
      });
      console.log("Batch created");

      await tx.stockMovement.create({
        data: {
          tenant_id,
          product_id: product.id,
          batch_id: batch.id,
          user_id: "test-user-id",
          movement_type: 'PURCHASE_IN',
          quantity: 10,
          reference_id: p.id
        }
      });
      console.log("StockMovement created");

      await tx.product.update({
        where: { id: product.id },
        data: {
          cost_price: 10
        }
      });
      console.log("Product updated");

      await tx.expense.create({
        data: {
          tenant_id,
          category_id: category.id,
          user_id: "test-user-id",
          amount: 100,
          date: new Date(),
          description: `Test`,
          reference_code: p.id,
          status: 'COMPLETED'
        }
      });
      console.log("Expense created");

      return p;
    });
    console.log("Success!");
  } catch(e) {
    console.error("TRANSACTION ERROR:", e);
  }
}

main().finally(() => prisma.$disconnect());
