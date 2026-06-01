export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, patient_id, payment_method, discount_total, grand_total, subtotal, tax_total } = body;

    // Hardcode tenant_id and cashier_id for now since we don't have session extraction perfectly set up here
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) {
      return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });
    }
    const tenant_id = pharmacy.id;
    
    let user = await prisma.userProfile.findFirst({ where: { tenant_id } });
    if (!user) {
      user = await prisma.userProfile.create({
        data: {
          auth_id: 'local-dev-auth',
          tenant_id,
          first_name: 'Cajero',
          last_name: 'Predeterminado',
          role: 'cajero'
        }
      });
    }
    const cashier_id = user.id;

    // We will do this in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create Sale
      const newSale = await tx.sale.create({
        data: {
          tenant_id,
          patient_id: patient_id || null,
          cashier_id,
          subtotal: subtotal || grand_total,
          tax_total: tax_total || 0,
          discount_total: discount_total || 0,
          grand_total,
          payment_method: payment_method || 'CASH',
          status: 'COMPLETED',
        }
      });

      // 2. Process Items and Inventory
      for (const item of items) {
        // Create SaleItem
        await tx.saleItem.create({
          data: {
            sale_id: newSale.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price,
            tax_rate: 0,
            tax_amount: 0,
            total: item.quantity * item.unit_price
          }
        });

        // Deduct inventory from the oldest batch
        let qtyToDeduct = item.quantity;
        const batches = await tx.batch.findMany({
          where: { product_id: item.product_id, quantity: { gt: 0 } },
          orderBy: { expiration_date: 'asc' }
        });

        for (const batch of batches) {
          if (qtyToDeduct <= 0) break;

          const deduction = Math.min(batch.quantity, qtyToDeduct);
          
          await tx.batch.update({
            where: { id: batch.id },
            data: { quantity: batch.quantity - deduction }
          });

          await tx.stockMovement.create({
            data: {
              tenant_id,
              product_id: item.product_id,
              batch_id: batch.id,
              user_id: cashier_id,
              movement_type: 'SALE_OUT',
              quantity: -deduction,
              reference_id: newSale.id
            }
          });

          qtyToDeduct -= deduction;
        }

        // If we still have qtyToDeduct > 0, it means we oversold.
        // We will just allow negative stock on a hypothetical "default" batch or just record a movement without batch
        if (qtyToDeduct > 0) {
          await tx.stockMovement.create({
            data: {
              tenant_id,
              product_id: item.product_id,
              user_id: cashier_id,
              movement_type: 'SALE_OUT',
              quantity: -qtyToDeduct,
              reference_id: newSale.id
            }
          });
        }
      }

      // 3. Create Payment
      await tx.payment.create({
        data: {
          sale_id: newSale.id,
          amount: grand_total,
          payment_method: payment_method || 'CASH'
        }
      });

      return newSale;
    });

    // Attempt WhatsApp Notification in background if patient exists
    try {
      if (body?.customer_id) {
        const auto = await prisma.whatsappAutomation.findFirst({
          where: { trigger_event: 'SALE_COMPLETED', is_active: true, tenant_id },
          include: { template: true }
        });
        
        if (auto && auto.template) {
          const patient = await prisma.patient.findUnique({ where: { id: body.customer_id }});
          if (patient && patient.phone) {
            let msg = auto.template.content;
            // Basic variable replacement {{1}} = name, {{2}} = total
            msg = msg.replace('{{1}}', patient.first_name);
            msg = msg.replace('{{2}}', `$${body.grand_total}`);

            await fetch('http://localhost:3001/api/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: patient.phone, message: msg })
            }).catch(e => console.error("WP API Not running", e));
          }
        }
      }
    } catch(e) {}

    return NextResponse.json({ success: true, sale });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
