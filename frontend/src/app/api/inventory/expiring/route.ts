export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ExpiryBucket, expiryBucket } from '@/lib/inventory/adjustments';

// Lotes con existencias que vencen en los próximos 90 días (o ya vencieron),
// agrupados por ventana, con unidades y valor a costo
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const limit = new Date();
  limit.setDate(limit.getDate() + 90);

  const batches = await prisma.batch.findMany({
    where: { tenant_id: auth.tenantId, quantity: { gt: 0 }, expiration_date: { lte: limit } },
    orderBy: { expiration_date: 'asc' },
    include: { product: { select: { id: true, brand_name: true, cost_price: true } } },
  });

  const buckets: Record<ExpiryBucket, { batches: number; units: number; value: number }> = {
    expired: { batches: 0, units: 0, value: 0 },
    d30: { batches: 0, units: 0, value: 0 },
    d60: { batches: 0, units: 0, value: 0 },
    d90: { batches: 0, units: 0, value: 0 },
  };
  const today = new Date();
  const items = [];

  for (const b of batches) {
    const bucket = expiryBucket(b.expiration_date, today);
    if (!bucket) continue;
    const value = Number(b.product.cost_price || 0) * b.quantity;
    buckets[bucket].batches += 1;
    buckets[bucket].units += b.quantity;
    buckets[bucket].value += value;
    items.push({
      product_id: b.product.id,
      product: b.product.brand_name,
      batch: b.batch_number,
      expiration_date: b.expiration_date.toISOString().split('T')[0],
      quantity: b.quantity,
      value,
      bucket,
    });
  }

  return NextResponse.json({ buckets, items: items.slice(0, 8) });
}
