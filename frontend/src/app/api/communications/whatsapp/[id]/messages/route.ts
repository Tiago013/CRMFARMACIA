export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { MESSAGE_EVENT } from '@/lib/whatsapp/messages';

const STATUS_LABEL: Record<string, string> = {
  simulado: 'Simulado (modo demo)',
  enviado: 'Enviado',
  error: 'No se pudo enviar',
};

// Mensajes de WhatsApp de un paciente (se guardan en su historial)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const events = await prisma.patientTimelineEvent.findMany({
      where: { tenant_id: auth.tenantId, patient_id: id, event_type: MESSAGE_EVENT },
      orderBy: { created_at: 'desc' },
    });

    const messages = events.map(ev => {
      const data = (ev.event_data ?? {}) as Record<string, string>;
      return {
        id: ev.id,
        text: data.text ?? '',
        isOutgoing: true,
        sender: data.trigger === 'SALE_COMPLETED' ? 'Automatización de venta' : (data.template ?? 'Plantilla'),
        status: STATUS_LABEL[data.status] ?? data.status,
        demo: data.mode === 'demo',
        timestamp: ev.created_at,
      };
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('communications/whatsapp', error);
    return NextResponse.json({ error: 'No se pudieron cargar los mensajes' }, { status: 500 });
  }
}
