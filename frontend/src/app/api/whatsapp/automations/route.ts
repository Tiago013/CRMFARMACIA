import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const automations = await prisma.whatsappAutomation.findMany({
      where: { tenant_id: pharmacy.id },
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
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const body = await request.json();
    const { trigger_event, template_id, is_active } = body;

    const automation = await prisma.whatsappAutomation.create({
      data: {
        tenant_id: pharmacy.id,
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
