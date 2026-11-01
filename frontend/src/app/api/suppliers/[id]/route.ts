import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const tenant_id = auth.tenantId;
    const body = await request.json();

    const supplier = await prisma.supplier.updateMany({
      where: { id: id, tenant_id },
      data: {
        name: body.name,
        tax_id: body.tax_id || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        status: body.status || 'active'
      }
    });

    if (supplier.count === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const updated = await prisma.supplier.findUnique({ where: { id: id } });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT supplier error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const tenant_id = auth.tenantId;

    const supplier = await prisma.supplier.deleteMany({
      where: { id: id, tenant_id }
    });

    if (supplier.count === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE supplier error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
