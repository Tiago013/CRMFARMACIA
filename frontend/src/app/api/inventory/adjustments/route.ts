export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/auth';
import { ADJUSTMENT_REASONS, AdjustmentReason, MOVEMENT_LABELS, planAdjustment } from '@/lib/inventory/adjustments';

const ADJUSTMENT_MOVEMENTS = Object.values(ADJUSTMENT_REASONS).map(r => r.movement);

class AdjustmentError extends Error {}

// POST { product_id, difference, reason: COUNT | EXPIRED | DAMAGED | LOST }
// Aplica el ajuste a los lotes y deja un movimiento de stock por cada lote tocado.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;
    const userId = auth.profileId ?? auth.authId;

    const body = await request.json();
    const difference = Number(body?.difference);
    const reason: AdjustmentReason = body?.reason in ADJUSTMENT_REASONS ? body.reason : 'COUNT';

    const product = await prisma.product.findFirst({ where: { id: body?.product_id, tenant_id: auth.tenantId }, select: { id: true } });
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const batches = await tx.batch.findMany({
        where: { product_id: product.id, tenant_id: auth.tenantId },
        select: { id: true, quantity: true, expiration_date: true },
      });
      const plan = planAdjustment(batches, difference, reason);
      if (!plan.ok) throw new AdjustmentError(plan.error);

      const movementType = ADJUSTMENT_REASONS[reason].movement;
      const changes = [...plan.changes];

      // Sobrante sin lote vigente: lote de ajuste con vencimiento a un año
      if (plan.newBatchQuantity > 0) {
        const expiration = new Date();
        expiration.setFullYear(expiration.getFullYear() + 1);
        const batch = await tx.batch.create({
          data: { tenant_id: auth.tenantId, product_id: product.id, batch_number: 'AJUSTE-CONTEO', quantity: 0, expiration_date: expiration },
        });
        changes.push({ batchId: batch.id, delta: plan.newBatchQuantity });
      }

      for (const change of changes) {
        // Condición en el UPDATE: si una venta se llevó esas unidades mientras tanto, falla
        const updated = await tx.batch.updateMany({
          where: { id: change.batchId, tenant_id: auth.tenantId, ...(change.delta < 0 ? { quantity: { gte: -change.delta } } : {}) },
          data: { quantity: { increment: change.delta } },
        });
        if (updated.count === 0) throw new AdjustmentError('El stock cambió mientras se ajustaba. Recarga e intenta de nuevo.');

        await tx.stockMovement.create({
          data: {
            tenant_id: auth.tenantId,
            product_id: product.id,
            batch_id: change.batchId,
            user_id: userId,
            movement_type: movementType,
            quantity: change.delta,
          },
        });
      }

      const stock = await tx.batch.aggregate({ where: { product_id: product.id, tenant_id: auth.tenantId }, _sum: { quantity: true } });
      return { movements: changes.length, total_stock: stock._sum.quantity ?? 0 };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof AdjustmentError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error('Adjustment error:', error);
    return NextResponse.json({ error: 'No se pudo registrar el ajuste' }, { status: 500 });
  }
}

// GET: últimos ajustes y mermas (auditoría)
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const movements = await prisma.stockMovement.findMany({
    where: { tenant_id: auth.tenantId, movement_type: { in: ADJUSTMENT_MOVEMENTS } },
    orderBy: { created_at: 'desc' },
    take: 30,
    include: { product: { select: { brand_name: true, sku: true } }, batch: { select: { batch_number: true } } },
  });

  return NextResponse.json(movements.map(m => ({
    id: m.id,
    date: m.created_at,
    product: m.product.brand_name,
    sku: m.product.sku,
    batch: m.batch?.batch_number ?? null,
    quantity: m.quantity,
    type: m.movement_type,
    label: MOVEMENT_LABELS[m.movement_type] ?? m.movement_type,
  })));
}
