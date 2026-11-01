export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Campos que el cliente puede modificar en un paciente
const EDITABLE_FIELDS = [
  'first_name', 'last_name', 'phone', 'document_id', 'email', 'birth_date',
  'address', 'eps', 'blood_group', 'allergies', 'medical_notes',
  'emergency_contact_name', 'emergency_contact_phone', 'preferences', 'tags',
] as const;
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const patient = await prisma.patient.findFirst({
      where: { id, tenant_id: auth.tenantId },
      include: {
        timeline_events: {
          orderBy: { created_at: 'desc' }
        },
        sales: {
          orderBy: { created_at: 'desc' },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Format purchase history (flattening sales into items for the view)
    const purchase_history = patient.sales.flatMap(sale => 
      sale.items.map(item => ({
        date: sale.created_at,
        brand_name: item.product.brand_name,
        quantity: item.quantity,
        grand_total: item.total
      }))
    );

    // Calculate LTV
    const ltv = patient.sales.reduce((sum, sale) => sum + sale.grand_total, 0);

    // Timeline mapping
    const timeline = patient.timeline_events.map(ev => ({
      title: ev.event_type,
      desc: typeof ev.event_data === 'object' && ev.event_data !== null ? (ev.event_data as any).description || JSON.stringify(ev.event_data) : String(ev.event_data),
      date: ev.created_at,
      icon: ev.event_type.includes('Compra') ? 'ShoppingCart' : ev.event_type.includes('Mensaje') ? 'MessageCircle' : 'Activity',
      color: ev.event_type.includes('Compra') ? 'bg-indigo-500' : ev.event_type.includes('Mensaje') ? 'bg-green-500' : 'bg-emerald-500'
    }));

    // If no timeline events but has sales, generate some timeline events from sales
    if (timeline.length === 0) {
      patient.sales.forEach(sale => {
        timeline.push({
          title: 'Compra en POS',
          desc: `Ticket #${sale.id.substring(0, 8)} por $${sale.grand_total.toLocaleString('es-CO')}`,
          date: sale.created_at,
          icon: 'ShoppingCart',
          color: 'bg-indigo-500'
        });
      });
      // Sort by date descending
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Chart Data (Gasto Mensual) - group by month
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth();
    const chart_data_map: Record<string, number> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      if (m < 0) m += 12;
      chart_data_map[months[m]] = 0;
    }

    patient.sales.forEach(sale => {
      const d = new Date(sale.created_at);
      const m = months[d.getMonth()];
      if (chart_data_map[m] !== undefined) {
        chart_data_map[m] += sale.grand_total;
      }
    });

    const chart_data = Object.keys(chart_data_map).map(k => ({
      name: k,
      gasto: chart_data_map[k]
    }));

    return NextResponse.json({
      ...patient,
      purchase_history,
      chart_data,
      timeline,
      ltv,
      score: Math.min(100, Math.max(40, Math.floor(80 + (patient.sales.length * 2)))) // Mock adherence score
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, any> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (data.birth_date) data.birth_date = new Date(data.birth_date);

    const result = await prisma.patient.updateMany({
      where: { id, tenant_id: auth.tenantId },
      data
    });
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.patient.findUnique({ where: { id } });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
