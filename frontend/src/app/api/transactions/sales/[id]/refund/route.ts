import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;

    const { id: saleId } = await params;
    
    // Perform refund in a transaction
    const refundedSale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, tenant_id: auth.tenantId },
        include: { items: true }
      });

      if (!sale) throw new Error('Sale not found');
      if (sale.status === 'REFUNDED') throw new Error('Sale already refunded');

      // Marca la venta como reembolsada solo si aún no lo estaba (evita doble reembolso concurrente)
      const marked = await tx.sale.updateMany({
        where: { id: saleId, tenant_id: auth.tenantId, status: { not: 'REFUNDED' } },
        data: { status: 'REFUNDED' }
      });
      if (marked.count === 0) throw new Error('Sale already refunded');
      const updatedSale = await tx.sale.findUnique({ where: { id: saleId } });

      // Devuelve el stock exactamente a los lotes de los que salió, usando los
      // movimientos SALE_OUT registrados en el checkout.
      const saleMovements = await tx.stockMovement.findMany({
        where: { tenant_id: sale.tenant_id, reference_id: sale.id, movement_type: 'SALE_OUT' }
      });

      for (const movement of saleMovements) {
        const qty = Math.abs(movement.quantity);
        if (movement.batch_id) {
          await tx.batch.updateMany({
            where: { id: movement.batch_id, tenant_id: sale.tenant_id },
            data: { quantity: { increment: qty } }
          });
        }

        await tx.stockMovement.create({
          data: {
            tenant_id: sale.tenant_id,
            product_id: movement.product_id,
            batch_id: movement.batch_id,
            user_id: auth.profileId ?? auth.authId,
            movement_type: 'MANUAL_ADJUST', // Devolución por reembolso
            quantity: qty,
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
