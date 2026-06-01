export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const salesAgg = await prisma.sale.aggregate({
      where: { tenant_id: pharmacy.id, status: 'COMPLETED' },
      _sum: { grand_total: true }
    });

    const income = Number(salesAgg._sum.grand_total || 0);

    const saleItems = await prisma.saleItem.findMany({
      where: { sale: { tenant_id: pharmacy.id, status: 'COMPLETED' } },
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
