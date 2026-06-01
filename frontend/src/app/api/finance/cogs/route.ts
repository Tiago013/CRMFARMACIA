import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '7d';

    const now = new Date();
    let startDate = new Date();
    if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'quarter') startDate.setMonth(now.getMonth() - 3);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenant_id = pharmacy.id;

    const sales = await prisma.sale.findMany({
      where: {
        tenant_id,
        status: 'COMPLETED',
        created_at: { gte: startDate }
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    let totalIncome = 0;
    let totalCogs = 0;

    // Monthly chart data map
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth();
    const chartMap: Record<string, number> = {};
    
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      if (m < 0) m += 12;
      chartMap[months[m]] = 0;
    }

    // Product breakdown map
    const productMap: Record<string, { name: string, category: string, quantity: number, unitCost: number, totalCogs: number }> = {};

    for (const sale of sales) {
      totalIncome += sale.grand_total;
      
      const d = new Date(sale.created_at);
      const monthName = months[d.getMonth()];

      let saleCogs = 0;
      
      for (const item of sale.items) {
        const cost = Number(item.product.cost_price || 0);
        const itemCogs = item.quantity * cost;
        saleCogs += itemCogs;
        totalCogs += itemCogs;

        if (!productMap[item.product_id]) {
          productMap[item.product_id] = {
            name: item.product.brand_name || item.product.sku,
            category: item.product.category?.name || 'General',
            quantity: 0,
            unitCost: cost,
            totalCogs: 0
          };
        }
        productMap[item.product_id].quantity += item.quantity;
        productMap[item.product_id].totalCogs += itemCogs;
      }

      if (chartMap[monthName] !== undefined) {
        chartMap[monthName] += saleCogs;
      }
    }

    const marginPercent = totalIncome > 0 ? ((totalIncome - totalCogs) / totalIncome) * 100 : 0;
    const cogsPercent = totalIncome > 0 ? (totalCogs / totalIncome) * 100 : 0;

    const chartData = Object.keys(chartMap).map(name => ({
      name,
      cogs: chartMap[name]
    }));

    const productsList = Object.values(productMap)
      .filter(p => p.totalCogs > 0)
      .sort((a, b) => b.totalCogs - a.totalCogs)
      .slice(0, 50); // top 50

    return NextResponse.json({
      metrics: {
        totalCogs,
        totalIncome,
        marginPercent,
        cogsPercent
      },
      chartData,
      productsList
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
