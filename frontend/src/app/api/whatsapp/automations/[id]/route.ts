import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { is_active } = body;

    const { id } = await params;

    const result = await prisma.whatsappAutomation.updateMany({
      where: { id, tenant_id: auth.tenantId },
      data: { is_active }
    });
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const automation = await prisma.whatsappAutomation.findUnique({
      where: { id },
      include: { template: true }
    });

    return NextResponse.json(automation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const result = await prisma.whatsappAutomation.deleteMany({
      where: { id, tenant_id: auth.tenantId }
    });
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
