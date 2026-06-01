export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: startDate },
        category: {
          name: {
            notIn: ['Compras de Inventario', 'Compras a Proveedores']
          }
        }
      },
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // In a real multi-tenant app, get tenant_id from auth session
    let tenant_id = body.tenant_id;
    if (!tenant_id) {
      const pharmacy = await prisma.pharmacy.findFirst();
      tenant_id = pharmacy?.id;
    }

    const newExpense = await prisma.expense.create({
      data: {
        tenant_id: tenant_id,
        category_id: body.category_id,
        amount: Number(body.amount),
        date: new Date(body.date),
        description: body.description,
        reference_code: body.reference_code,
        status: 'COMPLETED'
      },
      include: {
        category: true
      }
    });
    return NextResponse.json(newExpense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
