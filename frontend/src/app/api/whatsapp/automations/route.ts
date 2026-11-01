import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const automations = await prisma.whatsappAutomation.findMany({
      where: { tenant_id: auth.tenantId },
      include: { template: true },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(automations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { trigger_event, template_id, is_active } = body;

    const template = await prisma.whatsappTemplate.findFirst({ where: { id: template_id, tenant_id: auth.tenantId }, select: { id: true } });
    if (!template) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });

    const automation = await prisma.whatsappAutomation.create({
      data: {
        tenant_id: auth.tenantId,
        trigger_event,
        template_id,
        is_active: is_active ?? true
      },
      include: { template: true }
    });

    return NextResponse.json(automation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
