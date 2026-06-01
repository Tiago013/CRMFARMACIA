export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '7d';

    const now = new Date();
    let startDate = new Date();
    if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'quarter') startDate.setMonth(now.getMonth() - 3);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    // Aggregate Sales for Revenue
    const salesAgg = await prisma.sale.aggregate({
      where: { tenant_id: pharmacy.id, status: 'COMPLETED', created_at: { gte: startDate } },
      _sum: {
        grand_total: true
      }
    });

    const total_revenue = salesAgg._sum.grand_total || 0;

    // Calculate COGS (Cost of Goods Sold) as expenses for now
    const saleItems = await prisma.saleItem.findMany({
      where: { sale: { tenant_id: pharmacy.id, status: 'COMPLETED', created_at: { gte: startDate } } },
      include: { product: true }
    });

    let cogs = 0;
    for (const item of saleItems) {
      cogs += (item.quantity * Number(item.product?.cost_price || 0));
    }

    const opexAgg = await prisma.expense.aggregate({
      where: { 
        tenant_id: pharmacy.id, 
        status: 'COMPLETED',
        date: { gte: startDate },
        category: {
          name: {
            notIn: ['Compras de Inventario', 'Compras a Proveedores']
          }
        }
      },
      _sum: { amount: true }
    });
    const opex = opexAgg._sum.amount || 0;

    const total_expenses = cogs + opex;
    const net_profit = total_revenue - total_expenses;
    const profit_margin_percentage = total_revenue > 0 ? (net_profit / total_revenue) * 100 : 0;

    return NextResponse.json({
      total_revenue,
      total_expenses, // total expenses used in top KPIs
      cogs,
      opex,
      net_profit,
      profit_margin_percentage
    });
  } catch (error: any) {
    console.error("Finance metrics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
