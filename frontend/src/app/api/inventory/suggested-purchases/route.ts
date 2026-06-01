import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const tenant_id = pharmacy.id;

    // Get all products with their batches to calculate total stock
    const products = await prisma.product.findMany({
      where: { tenant_id },
      include: {
        category: true,
        batches: true,
      }
    });

    // Determine which products have low stock
    const lowStockProducts = products.map(p => {
      const totalStock = p.batches.reduce((sum, b) => sum + b.quantity, 0);
      return {
        ...p,
        totalStock
      };
    }).filter(p => p.totalStock <= p.min_stock);

    if (lowStockProducts.length === 0) {
      return NextResponse.json([]);
    }

    // For these low stock products, calculate their 30-day sales demand
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const productIds = lowStockProducts.map(p => p.id);

    // Group sales by product over the last 30 days
    const salesAgg = await prisma.saleItem.groupBy({
      by: ['product_id'],
      where: {
        product_id: { in: productIds },
        sale: {
          tenant_id: tenant_id,
          status: 'COMPLETED',
          created_at: { gte: thirtyDaysAgo }
        }
      },
      _sum: {
        quantity: true
      }
    });

    const salesMap: Record<string, number> = {};
    for (const s of salesAgg) {
      salesMap[s.product_id] = s._sum.quantity || 0;
    }

    // Build the final suggestions array
    const suggestions = lowStockProducts.map(p => {
      const soldLast30Days = salesMap[p.id] || 0;
      // Approximate weekly demand (30 days / 4.28 weeks)
      const weeklyDemand = Math.round(soldLast30Days / 4.28);
      
      // Calculate suggested quantity:
      // If there is actual demand, we aim to restock for 4 weeks of demand
      // If there is no demand recently, we just restock to twice the min_stock to be safe.
      let suggestedQty = 0;
      if (weeklyDemand > 0) {
        // Target is 4 weeks of coverage
        const targetStock = weeklyDemand * 4;
        suggestedQty = Math.max(targetStock - p.totalStock, p.min_stock * 2);
      } else {
        // Fallback for new items or slow movers
        suggestedQty = p.min_stock > 0 ? p.min_stock * 2 : 10;
      }

      return {
        id: p.id,
        name: p.brand_name,
        category: p.category?.name || 'Sin Categoría',
        currentStock: p.totalStock,
        weeklyDemand: weeklyDemand,
        suggestedQty: suggestedQty
      };
    });

    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error("GET suggested-purchases error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
