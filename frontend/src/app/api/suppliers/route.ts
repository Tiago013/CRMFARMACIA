import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const tenant_id = auth.tenantId;

    const suppliers = await prisma.supplier.findMany({
      where: { tenant_id },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(suppliers);
  } catch (error: any) {
    console.error("GET suppliers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const tenant_id = auth.tenantId;
    const body = await request.json();

    const supplier = await prisma.supplier.create({
      data: {
        tenant_id,
        name: body.name,
        tax_id: body.tax_id || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        status: body.status || 'active'
      }
    });

    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error("POST supplier error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
