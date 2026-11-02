export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { purchaseAdherence, recentPurchaseCounts } from '@/lib/crm/adherence';

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
    const ltv = patient.sales.reduce((sum, sale) => sum + Number(sale.grand_total), 0);

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
          desc: `Ticket #${sale.id.substring(0, 8)} por $${Number(sale.grand_total).toLocaleString('es-CO')}`,
          date: sale.created_at,
          icon: 'ShoppingCart',
          color: 'bg-indigo-500'
        });
      });
      // Sort by date descending
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Gasto de los últimos 6 meses (por año y mes, para no mezclar con el año anterior)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const chart_data = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, name: months[d.getMonth()], gasto: 0 };
    });
    for (const sale of patient.sales) {
      const d = new Date(sale.created_at);
      const bucket = chart_data.find(c => c.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.gasto += Number(sale.grand_total);
    }

    // Adherencia y frecuencia calculadas con las fechas reales de compra
    const saleDates = patient.sales.map(s => s.created_at);
    const adherence = purchaseAdherence(saleDates, now);

    return NextResponse.json({
      ...patient,
      purchase_history,
      chart_data: chart_data.map(({ name, gasto }) => ({ name, gasto })),
      timeline,
      ltv,
      sales_count: patient.sales.length,
      score: adherence.score,
      avg_interval_days: adherence.avgIntervalDays,
      days_since_last: adherence.daysSinceLast,
      visits: recentPurchaseCounts(saleDates, now)
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
