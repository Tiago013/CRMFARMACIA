import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { MESSAGE_EVENT, whatsappMode } from '@/lib/whatsapp/messages';
import { sendWhatsApp } from '@/lib/whatsapp/send';

export const dynamic = 'force-dynamic';

// Bandeja de salida: modo actual y últimos mensajes de la farmacia
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const events = await prisma.patientTimelineEvent.findMany({
    where: { tenant_id: auth.tenantId, event_type: MESSAGE_EVENT },
    orderBy: { created_at: 'desc' },
    take: 50,
    select: { id: true, created_at: true, event_data: true, patient: { select: { id: true, first_name: true, last_name: true } } },
  });

  return NextResponse.json({
    mode: whatsappMode(),
    messages: events.map((e) => ({
      id: e.id,
      created_at: e.created_at,
      patient: { id: e.patient.id, name: `${e.patient.first_name} ${e.patient.last_name}`.trim() },
      ...(e.event_data as Record<string, unknown>),
    })),
  });
}

// Envía (o simula en modo demo) un mensaje con plantilla a un paciente
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const { patient_id, template_id, sale_id } = body ?? {};
  if (typeof patient_id !== 'string' || typeof template_id !== 'string') {
    return NextResponse.json({ error: 'Faltan el paciente o la plantilla' }, { status: 400 });
  }

  try {
    const result = await sendWhatsApp({
      tenantId: auth.tenantId,
      patientId: patient_id,
      templateId: template_id,
      saleId: typeof sale_id === 'string' && sale_id ? sale_id : null,
      userId: auth.profileId,
      trigger: 'manual',
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    return NextResponse.json(result);
  } catch (error) {
    console.error('whatsapp/messages', error);
    return NextResponse.json({ error: 'No se pudo registrar el mensaje' }, { status: 500 });
  }
}
