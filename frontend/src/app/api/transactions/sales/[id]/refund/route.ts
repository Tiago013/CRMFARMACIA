import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: saleId } = await params;
    
    // Perform refund in a transaction
    const refundedSale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true }
      });

      if (!sale) throw new Error('Sale not found');
      if (sale.status === 'REFUNDED') throw new Error('Sale already refunded');

      // Update sale status
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: { status: 'REFUNDED' }
      });

      // Restore stock and create movements
      for (const item of sale.items) {
        // Find batch to restore stock
        if (item.batch_id) {
          await tx.batch.update({
            where: { id: item.batch_id },
            data: { quantity: { increment: item.quantity } }
          });
        }

        // Log movement
        await tx.stockMovement.create({
          data: {
            tenant_id: sale.tenant_id,
            product_id: item.product_id,
            batch_id: item.batch_id,
            user_id: sale.cashier_id,
            movement_type: 'MANUAL_ADJUST', // Treating refund as adjust back in
            quantity: item.quantity,
            reference_id: sale.id
          }
        });
      }

      return updatedSale;
    });

    return NextResponse.json(refundedSale);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
