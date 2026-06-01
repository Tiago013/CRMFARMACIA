export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    let defaultPharmacy = await prisma.pharmacy.findFirst();
    if (!defaultPharmacy) throw new Error('No pharmacy found');

    const purchases = await prisma.purchase.findMany({
      where: { tenant_id: defaultPharmacy.id },
      include: {
        supplier: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    
    return NextResponse.json(purchases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier_id, invoice_number, items } = body;
    // items: [{ product_id, quantity, unit_cost, batch_number, expiration_date }]

    let defaultPharmacy = await prisma.pharmacy.findFirst();
    if (!defaultPharmacy) throw new Error('No pharmacy found');
    const tenant_id = defaultPharmacy.id;
    const user_id = 'SYSTEM'; // MVP: replace with actual user session id

    const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_cost), 0);

    const newPurchase = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          tenant_id,
          supplier_id,
          user_id,
          invoice_number,
          total_amount,
          items: {
            create: items.map((i: any) => ({
              product_id: i.product_id,
              batch_number: i.batch_number,
              expiration_date: i.expiration_date ? new Date(i.expiration_date) : null,
              quantity: i.quantity,
              unit_cost: i.unit_cost,
              total_cost: i.quantity * i.unit_cost
            }))
          }
        },
        include: { items: true }
      });

      // 2. Process Items (Update Stock, Batches, Cost)
      for (const item of purchase.items) {
        
        // Update product cost_price (Automated pricing requested by user)
        await tx.product.update({
          where: { id: item.product_id },
          data: { cost_price: item.unit_cost }
        });

        // Handle Batch
        let batch_id = null;
        if (item.batch_number && item.expiration_date) {
          // Check if batch exists
          let batch = await tx.batch.findFirst({
            where: {
              product_id: item.product_id,
              batch_number: item.batch_number
            }
          });

          if (batch) {
            batch = await tx.batch.update({
              where: { id: batch.id },
              data: { quantity: { increment: item.quantity } }
            });
          } else {
            batch = await tx.batch.create({
              data: {
                tenant_id,
                product_id: item.product_id,
                batch_number: item.batch_number,
                expiration_date: new Date(item.expiration_date),
                quantity: item.quantity
              }
            });
          }
          batch_id = batch.id;
        }

        // Create StockMovement
        await tx.stockMovement.create({
          data: {
            tenant_id,
            product_id: item.product_id,
            batch_id: batch_id,
            user_id,
            movement_type: 'PURCHASE_IN',
            quantity: item.quantity,
            reference_id: purchase.id
          }
        });
      }

      return purchase;
    });

    return NextResponse.json(newPurchase, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
