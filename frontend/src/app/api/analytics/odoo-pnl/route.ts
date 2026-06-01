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

    const salesAgg = await prisma.sale.aggregate({
      where: { tenant_id: pharmacy.id, status: 'COMPLETED', created_at: { gte: startDate } },
      _sum: { grand_total: true }
    });

    const income = Number(salesAgg._sum.grand_total || 0);

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

    const net_profit = income - cogs - opex;

    return NextResponse.json({
      income,
      cogs,
      opex,
      net_profit
    });
  } catch (error: any) {
    console.error("Odoo PNL error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
