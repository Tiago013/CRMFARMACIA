export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '7d';

    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const tenant_id = pharmacy.id;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'quarter') startDate.setMonth(now.getMonth() - 3);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    // 1. Fetch Sales
    const sales = await prisma.sale.findMany({
      where: {
        tenant_id,
        status: 'COMPLETED',
        created_at: { gte: startDate }
      },
      include: {
        items: { include: { product: { include: { category: true } } } }
      },
      orderBy: { created_at: 'asc' }
    });

    // 2. Fetch Expenses
    const expensesAgg = await prisma.expense.aggregate({
      where: {
        tenant_id,
        status: 'COMPLETED',
        date: { gte: startDate }
      },
      _sum: { amount: true }
    });
    const totalExpenses = expensesAgg._sum.amount || 0;

    let totalRevenue = 0;
    let totalCogs = 0;
    const categoryMap: Record<string, number> = {};
    const dateMap: Record<string, { revenue: number, orders: number }> = {};
    const hourMap: Record<string, { revenue: number, orders: number }> = {};
    const productProfits: Record<string, { revenue: number, cogs: number, name: string }> = {};

    for (const sale of sales) {
      const revenue = Number(sale.grand_total);
      totalRevenue += revenue;
      
      const dateStr = sale.created_at.toISOString().split('T')[0];
      if (!dateMap[dateStr]) dateMap[dateStr] = { revenue: 0, orders: 0 };
      dateMap[dateStr].revenue += revenue;
      dateMap[dateStr].orders += 1;

      const hourStr = sale.created_at.getHours().toString().padStart(2, '0') + ':00';
      if (!hourMap[hourStr]) hourMap[hourStr] = { revenue: 0, orders: 0 };
      hourMap[hourStr].revenue += revenue;
      hourMap[hourStr].orders += 1;

      for (const item of sale.items) {
        const cost = Number(item.product.cost_price || 0) * item.quantity;
        totalCogs += cost;
        
        const itemTotal = Number(item.total);
        const catName = item.product.category?.name || 'Sin Categoría';
        categoryMap[catName] = (categoryMap[catName] || 0) + itemTotal;

        const prodId = item.product.id;
        if (!productProfits[prodId]) {
          productProfits[prodId] = { revenue: 0, cogs: 0, name: item.product.brand_name };
        }
        productProfits[prodId].revenue += itemTotal;
        productProfits[prodId].cogs += cost;
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const previousRevenue = totalRevenue * 0.8; // mock previous for trend

    // Format KPIs
    const kpis = [
      {
        title: "Ingresos Totales",
        value: `$${(totalRevenue).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        change: "15%",
        trend: "up"
      },
      {
        title: "Gastos (Compras + Operativos)",
        value: `$${(totalCogs + totalExpenses).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        change: "8%",
        trend: "down"
      },
      {
        title: "Ticket Promedio",
        value: `$${(sales.length > 0 ? totalRevenue / sales.length : 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        change: "2%",
        trend: "up"
      },
      {
        title: "Utilidad Neta",
        value: `$${netProfit.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        change: "5%",
        trend: "up"
      }
    ];

    // Format Trend
    const sales_trend = Object.keys(dateMap).map(date => ({
      date,
      revenue: dateMap[date].revenue,
      orders: dateMap[date].orders
    }));

    // Format Category
    const category_distribution = Object.keys(categoryMap).map(name => ({
      name,
      value: categoryMap[name]
    })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5

    // Format Peak Hours
    const peak_hours = Object.keys(hourMap).map(hour => ({
      hour,
      revenue: hourMap[hour].revenue,
      orders: hourMap[hour].orders
    })).sort((a, b) => a.hour.localeCompare(b.hour));

    // Format Top Profitable
    const top_profitable = Object.values(productProfits).map(p => {
      const net_profit = p.revenue - p.cogs;
      const margin_percentage = p.revenue > 0 ? (net_profit / p.revenue) * 100 : 0;
      return {
        name: p.name,
        net_profit,
        margin_percentage
      };
    }).sort((a, b) => b.net_profit - a.net_profit).slice(0, 5);

    // Expiration Risk (Mock for now, or real if we query batches)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const atRiskBatches = await prisma.batch.aggregate({
      where: { tenant_id, expiration_date: { lte: thirtyDaysFromNow } },
      _count: { id: true }
    });
    const safeBatches = await prisma.batch.aggregate({
      where: { tenant_id, expiration_date: { gt: thirtyDaysFromNow } },
      _count: { id: true }
    });

    const expiration_risk = [
      { status: 'Seguro (> 30 días)', value: safeBatches._count.id || 0 },
      { status: 'En Riesgo (< 30 días)', value: atRiskBatches._count.id || 0 }
    ];

    return NextResponse.json({
      kpis,
      sales_trend,
      category_distribution,
      peak_hours,
      top_profitable,
      expiration_risk
    });

  } catch (error: any) {
    console.error("Snapshot error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
