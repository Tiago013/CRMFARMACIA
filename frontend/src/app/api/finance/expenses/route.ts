export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
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
        tenant_id: auth.tenantId,
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
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    
    const tenant_id = auth.tenantId;

    const category = await prisma.expenseCategory.findFirst({ where: { id: body.category_id, tenant_id }, select: { id: true } });
    if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });

    const newExpense = await prisma.expense.create({
      data: {
        tenant_id: tenant_id,
        category_id: body.category_id,
        user_id: auth.profileId ?? auth.authId,
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
