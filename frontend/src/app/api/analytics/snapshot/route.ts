export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { compareToPrevious, daysInRange, periodRanges, type DateRange } from '@/lib/analytics/periods';

const EXCLUDED_EXPENSES = ['Compras de Inventario', 'Compras a Proveedores'];

// Totales de un periodo: ingresos, costo de lo vendido (COGS), gastos operativos y número de ventas
async function periodTotals(tenant_id: string, { start, end }: DateRange) {
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { tenant_id, status: 'COMPLETED', created_at: { gte: start, lt: end } },
      select: { grand_total: true, items: { select: { quantity: true, product: { select: { cost_price: true } } } } }
    }),
    prisma.expense.aggregate({
      where: { tenant_id, status: 'COMPLETED', date: { gte: start, lt: end }, category: { name: { notIn: EXCLUDED_EXPENSES } } },
      _sum: { amount: true }
    })
  ]);
  const revenue = sales.reduce((acc, s) => acc + Number(s.grand_total), 0);
  const cogs = sales.reduce((acc, s) => acc + s.items.reduce((a, i) => a + Number(i.product.cost_price || 0) * i.quantity, 0), 0);
  const opex = Number(expenses._sum.amount || 0);
  return { revenue, cogs, opex, count: sales.length, net: revenue - cogs - opex };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '7d';

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const tenant_id = auth.tenantId;

    // Periodo actual y el anterior de igual duración (para las tendencias)
    const ranges = periodRanges(period);
    const startDate = ranges.current.start;

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
        date: { gte: startDate },
        category: {
          name: { notIn: EXCLUDED_EXPENSES }
        }
      },
      _sum: { amount: true }
    });
    const totalExpenses = Number(expensesAgg._sum.amount || 0);

    let totalRevenue = 0;
    let totalCogs = 0;
    const categoryMap: Record<string, number> = {};
    // Todos los días del rango, también los que no tuvieron ventas
    const dateMap: Record<string, { revenue: number, orders: number }> = Object.fromEntries(
      daysInRange(ranges.current).map(day => [day, { revenue: 0, orders: 0 }])
    );
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
    const ticket = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Tendencias reales contra el periodo anterior
    const prev = await periodTotals(tenant_id, ranges.previous);
    const prevTicket = prev.count > 0 ? prev.revenue / prev.count : 0;
    const money = (v: number) => `$${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

    const kpis = [
      { title: "Ingresos Totales", value: money(totalRevenue), ...compareToPrevious(totalRevenue, prev.revenue) },
      { title: "Gastos (Compras + Operativos)", value: money(totalCogs + totalExpenses), ...compareToPrevious(totalCogs + totalExpenses, prev.cogs + prev.opex, false) },
      { title: "Ticket Promedio", value: money(ticket), ...compareToPrevious(ticket, prevTicket) },
      { title: "Utilidad Neta", value: money(netProfit), ...compareToPrevious(netProfit, prev.net) }
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

    // Riesgo de vencimiento: lotes con existencias que vencen en 30 días o menos
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const atRiskBatches = await prisma.batch.aggregate({
      where: { tenant_id, quantity: { gt: 0 }, expiration_date: { lte: thirtyDaysFromNow } },
      _count: { id: true }
    });
    const safeBatches = await prisma.batch.aggregate({
      where: { tenant_id, quantity: { gt: 0 }, expiration_date: { gt: thirtyDaysFromNow } },
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
