export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    
    // In a real system, there would be a dedicated Messages table.
    // Here we extract them from the timeline events.
    const timelineEvents = await prisma.patientTimelineEvent.findMany({
      where: { 
        tenant_id: auth.tenantId,
        patient_id: id,
        event_type: { contains: 'Mensaje' }
      },
      orderBy: { created_at: 'desc' }
    });

    const messages = timelineEvents.map(ev => ({
      id: ev.id,
      text: typeof ev.event_data === 'object' && ev.event_data !== null ? (ev.event_data as any).text || (ev.event_data as any).description : String(ev.event_data),
      isOutgoing: true, // Assuming system sent them
      sender: 'Asistente IA',
      timestamp: ev.created_at
    }));

    // Sin historial se devuelve la lista vacía: la pantalla muestra "No hay mensajes"
    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
