import prisma from '../src/lib/prisma';

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  console.log("🧹 Limpiando base de datos...");
  // Clear all transaction data
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.pharmacy.deleteMany();

  console.log("🏗️ Creando Tenant (Farmacia)...");
  const pharmacy = await prisma.pharmacy.create({
    data: {
      name: "FarmaAI Default Pharmacy"
    }
  });

  const tenantId = pharmacy.id;
  const adminUserId = "USER-ADMIN-1";

  console.log("👥 Creando 50 Pacientes...");
  const patients = [];
  for (let i = 1; i <= 50; i++) {
    patients.push(await prisma.patient.create({
      data: {
        tenant_id: tenantId,
        first_name: `Paciente ${i}`,
        last_name: `Prueba`,
        document_id: `10000000${i}`,
        phone: `30000000${i}`,
        preferences: i % 3 === 0 ? { is_vip: true, medicamentos: 'Losartán;Aspirina' } : {}
      }
    }));
  }

  console.log("🏢 Creando Proveedores...");
  const suppliersData = [
    { name: "Laboratorios MK", email: "ventas@mk.com", phone: "0180001" },
    { name: "Genfar", email: "contacto@genfar.com", phone: "0180002" },
    { name: "Bayer", email: "pedidos@bayer.com", phone: "0180003" },
    { name: "Lafrancol", email: "dist@lafrancol.com", phone: "0180004" },
    { name: "Tecnoquímicas", email: "ventas@tq.com", phone: "0180005" },
  ];
  
  const suppliers = [];
  for (const s of suppliersData) {
    suppliers.push(await prisma.supplier.create({
      data: { tenant_id: tenantId, ...s }
    }));
  }

  console.log("🏷️ Creando Categorías...");
  const categoryNames = [
    "Analgésicos", "Antibióticos", "Cardiovasculares", "Dermatología", 
    "Vitaminas", "Gastrointestinales", "Respiratorios", "Diabéticos", 
    "Oftálmicos", "Cuidado Personal", "Maternidad", "Ortopedia", "Genéricos"
  ];
  
  const categories = [];
  for (const name of categoryNames) {
    categories.push(await prisma.category.create({
      data: { tenant_id: tenantId, name, description: `Categoría de ${name}` }
    }));
  }

  console.log("💊 Creando 100 Medicamentos...");
  const products = [];
  for (let i = 1; i <= 100; i++) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const sup = suppliers[Math.floor(Math.random() * suppliers.length)];
    const isPrescription = Math.random() > 0.5;
    const baseCost = Math.floor(Math.random() * 50000) + 2000;
    const price = Math.floor(baseCost * (1.3 + Math.random() * 0.5)); // 30-80% margin

    products.push(await prisma.product.create({
      data: {
        tenant_id: tenantId,
        category_id: cat.id,
        supplier_id: sup.id,
        brand_name: `Medicamento ${i} ${isPrescription ? 'Forte' : 'Plus'}`,
        active_ingredient: `Compuesto Activo ${i}`,
        sku: `SKU-${1000+i}`,
        barcode: `770000000${1000+i}`,
        unit_price: price,
        cost_price: baseCost,
        min_stock: 10
      }
    }));
  }

  console.log("⏳ Simulando 6 meses de historial (Compras y Ventas)...");
  
  const today = new Date();
  const startDate = addDays(today, -30); // 1 month ago

  // Simularemos día por día
  let currentDate = new Date(startDate);
  
  let purchaseCount = 0;
  let saleCount = 0;

  while (currentDate <= today) {
    // 1. Cada 15 días hacemos una compra grande a los proveedores
    if (currentDate.getDate() === 1 || currentDate.getDate() === 15) {
      for (const sup of suppliers) {
        // Seleccionamos 10 productos al azar de este proveedor
        const supProducts = products.filter(p => p.supplier_id === sup.id).sort(() => 0.5 - Math.random()).slice(0, 10);
        if (supProducts.length === 0) continue;

        const purchaseItems = supProducts.map(p => {
          const qty = Math.floor(Math.random() * 50) + 20; // 20 a 70 units
          // Expiración: Entre 3 meses y 2 años desde la compra
          const expDays = Math.floor(Math.random() * 600) + 90;
          return {
            product_id: p.id,
            quantity: qty,
            unit_cost: p.cost_price,
            total_cost: qty * p.cost_price,
            batch_number: `L-${currentDate.getFullYear()}${currentDate.getMonth()+1}-${p.id.slice(0,4)}`,
            expiration_date: addDays(currentDate, expDays)
          };
        });

        const totalAmount = purchaseItems.reduce((acc, item) => acc + item.total_cost, 0);

        // Crear Purchase
        const purchase = await prisma.purchase.create({
          data: {
            tenant_id: tenantId,
            supplier_id: sup.id,
            user_id: adminUserId,
            invoice_number: `INV-${currentDate.getTime()}-${sup.id.slice(0,4)}`,
            total_amount: totalAmount,
            created_at: currentDate,
            updated_at: currentDate,
          }
        });

        // Crear Purchase Items, Lotes y Movimientos
        for (const item of purchaseItems) {
          await prisma.purchaseItem.create({
            data: {
              purchase_id: purchase.id,
              product_id: item.product_id,
              batch_number: item.batch_number,
              expiration_date: item.expiration_date,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              total_cost: item.total_cost
            }
          });

          const batch = await prisma.batch.create({
            data: {
              tenant_id: tenantId,
              product_id: item.product_id,
              batch_number: item.batch_number,
              expiration_date: item.expiration_date,
              quantity: item.quantity
            }
          });

          await prisma.stockMovement.create({
            data: {
              tenant_id: tenantId,
              product_id: item.product_id,
              batch_id: batch.id,
              user_id: adminUserId,
              movement_type: 'PURCHASE_IN',
              quantity: item.quantity,
              reference_id: purchase.id,
              created_at: currentDate,
            }
          });
        }
        purchaseCount++;
      }
    }

    // 2. Ventas Diarias (5 a 15 ventas por día)
    const dailySalesCount = Math.floor(Math.random() * 10) + 5;
    
    for (let s = 0; s < dailySalesCount; s++) {
      const patient = Math.random() > 0.3 ? patients[Math.floor(Math.random() * patients.length)] : null;
      
      // Select 1 to 4 random products that have stock
      // We need to query current batches with stock > 0
      const availableBatches = await prisma.batch.findMany({
        where: { tenant_id: tenantId, quantity: { gt: 0 } },
        take: 50
      });

      if (availableBatches.length === 0) continue; // no hay stock para vender hoy

      const numItems = Math.floor(Math.random() * 4) + 1;
      const selectedBatches = availableBatches.sort(() => 0.5 - Math.random()).slice(0, numItems);
      
      let subtotal = 0;
      const saleItemsToCreate = [];
      const stockUpdates = [];

      for (const b of selectedBatches) {
        const prod = await prisma.product.findUnique({ where: { id: b.product_id } });
        if (!prod) continue;

        const qtyToBuy = Math.min(Math.floor(Math.random() * 3) + 1, b.quantity);
        const itemTotal = qtyToBuy * prod.unit_price;
        subtotal += itemTotal;

        saleItemsToCreate.push({
          product_id: prod.id,
          batch_id: b.id,
          quantity: qtyToBuy,
          unit_price: prod.unit_price,
          subtotal: itemTotal,
          tax_rate: 0.19,
          tax_amount: itemTotal * 0.19,
          total: itemTotal * 1.19
        });

        stockUpdates.push({
          batch_id: b.id,
          product_id: prod.id,
          qty: qtyToBuy
        });
      }

      if (saleItemsToCreate.length === 0) continue;

      const grandTotal = saleItemsToCreate.reduce((acc, i) => acc + i.total, 0);

      // Create Sale with exact timestamp for this day (random hour between 8 AM and 8 PM)
      const saleTime = new Date(currentDate);
      saleTime.setHours(8 + Math.floor(Math.random() * 12));
      saleTime.setMinutes(Math.floor(Math.random() * 60));

      const sale = await prisma.sale.create({
        data: {
          tenant_id: tenantId,
          cashier_id: adminUserId,
          patient_id: patient?.id,
          subtotal: subtotal,
          tax_total: grandTotal - subtotal,
          discount_total: 0,
          grand_total: grandTotal,
          payment_method: Math.random() > 0.5 ? 'card' : 'cash',
          status: 'COMPLETED',
          created_at: saleTime,
          updated_at: saleTime
        }
      });

      // Insert Items & Payments & Stock movements
      for (const si of saleItemsToCreate) {
        await prisma.saleItem.create({
          data: {
            sale_id: sale.id,
            ...si
          }
        });
      }

      await prisma.payment.create({
        data: {
          sale_id: sale.id,
          amount: grandTotal,
          payment_method: sale.payment_method,
          created_at: saleTime
        }
      });

      for (const update of stockUpdates) {
        await prisma.batch.update({
          where: { id: update.batch_id },
          data: { quantity: { decrement: update.qty } }
        });

        await prisma.stockMovement.create({
          data: {
            tenant_id: tenantId,
            product_id: update.product_id,
            batch_id: update.batch_id,
            user_id: adminUserId,
            movement_type: 'SALE_OUT',
            quantity: update.qty,
            reference_id: sale.id,
            created_at: saleTime
          }
        });
      }

      saleCount++;
    }

    currentDate = addDays(currentDate, 1);
    // console log progress
    if (currentDate.getDate() % 10 === 0) {
      console.log(`... Generados datos hasta ${currentDate.toLocaleDateString()}`);
    }
  }

  console.log("✅ SEED MASIVO COMPLETADO CON ÉXITO");
  console.log(`📊 Resumen:`);
  console.log(`- Farmacia y Configuraciones OK`);
  console.log(`- 50 Pacientes CRM`);
  console.log(`- 5 Proveedores y 13 Categorías`);
  console.log(`- 100 Productos en Catálogo`);
  console.log(`- ${purchaseCount} Facturas de Compra (Ingresos de Inventario con Lotes FEFO)`);
  console.log(`- ${saleCount} Ventas Históricas (Salidas POS y Finanzas P&L)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
