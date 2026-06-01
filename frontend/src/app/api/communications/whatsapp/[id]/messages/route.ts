export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // In a real system, there would be a dedicated Messages table.
    // Here we extract them from the timeline events.
    const timelineEvents = await prisma.patientTimelineEvent.findMany({
      where: { 
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

    // If no messages, return a mock welcome message
    if (messages.length === 0) {
      messages.push({
        id: 'mock-1',
        text: '¡Hola! Bienvenido a nuestra farmacia. Estamos aquí para ayudarte con tus prescripciones y compras.',
        isOutgoing: true,
        sender: 'Sistema',
        timestamp: new Date(Date.now() - 86400000 * 5)
      });
      messages.push({
        id: 'mock-2',
        text: 'Gracias por registrarte. ¿Tienen servicio a domicilio?',
        isOutgoing: false,
        sender: 'Paciente',
        timestamp: new Date(Date.now() - 86400000 * 4)
      });
      messages.push({
        id: 'mock-3',
        text: 'Sí, claro. Cubrimos toda la ciudad. Tu pedido llegará en menos de 2 horas.',
        isOutgoing: true,
        sender: 'Asistente',
        timestamp: new Date(Date.now() - 86400000 * 4 + 180000) // 3 mins later
      });
    }

    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
