export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const tenant_id = pharmacy.id;

    // Fetch all sale items to aggregate products
    const saleItems = await prisma.saleItem.findMany({
      where: { sale: { tenant_id, status: 'COMPLETED' } },
      include: { product: true }
    });

    const productMap: Record<string, {
      name: string;
      sku: string;
      units_sold: number;
      revenue: number;
      cost: number;
    }> = {};

    for (const item of saleItems) {
      const pid = item.product.id;
      if (!productMap[pid]) {
        productMap[pid] = {
          name: item.product.brand_name,
          sku: item.product.sku,
          units_sold: 0,
          revenue: 0,
          cost: 0
        };
      }
      productMap[pid].units_sold += item.quantity;
      productMap[pid].revenue += item.total;
      productMap[pid].cost += item.quantity * Number(item.product.cost_price || 0);
    }

    const topProducts = Object.values(productMap).map(p => {
      const net_profit = p.revenue - p.cost;
      const margin = p.revenue > 0 ? (net_profit / p.revenue) * 100 : 0;
      return {
        Producto: p.name,
        SKU: p.sku,
        Unidades_Vendidas: p.units_sold,
        Ingresos_Totales: p.revenue,
        Margen_Porcentaje: `${margin.toFixed(2)}%`,
        Utilidad_Neta: net_profit
      };
    }).sort((a, b) => b.Utilidad_Neta - a.Utilidad_Neta).slice(0, 20);

    return NextResponse.json(topProducts);
  } catch (error: any) {
    console.error("Top products error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
