export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(categories);
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
