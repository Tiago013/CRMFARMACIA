export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const tenant_id = pharmacy.id;
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    // Get products with stock > 0
    const productsWithStock = await prisma.product.findMany({
      where: { tenant_id },
      include: {
        batches: { where: { quantity: { gt: 0 } } },
        sale_items: {
          where: { sale: { status: 'COMPLETED', created_at: { gte: fortyFiveDaysAgo } } },
          take: 1
        }
      }
    });

    const stagnant = [];
    for (const p of productsWithStock) {
      const totalStock = p.batches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalStock > 0 && p.sale_items.length === 0) {
        // Stagnant!
        stagnant.push({
          Producto: p.brand_name,
          SKU: p.sku,
          Stock_Actual: totalStock,
          Capital_Inmovilizado: totalStock * Number(p.cost_price || 0),
          Dias_Sin_Movimiento: '> 45'
        });
      }
    }

    return NextResponse.json(stagnant.sort((a, b) => b.Capital_Inmovilizado - a.Capital_Inmovilizado));
  } catch (error: any) {
    console.error("Stagnant inventory error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
