export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const categories = await prisma.expenseCategory.findMany({
      where: { tenant_id: auth.tenantId },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    
    const tenant_id = auth.tenantId;

    const newCategory = await prisma.expenseCategory.create({
      data: {
        tenant_id: tenant_id,
        name: body.name,
        description: body.description,
        color: body.color || '#6366f1'
      }
    });
    return NextResponse.json(newCategory);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
