import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const PLAN_LIMITS = {
  STARTER: { users: 3, patients: 5000, pos: 10000, wa: 0 },
  PRO: { users: 15, patients: 15000, pos: 50000, wa: 3000 },
  ENTERPRISE: { users: 9999, patients: 999999, pos: 999999, wa: 999999 },
};

const PLAN_PRICES = {
  STARTER: 50000,
  PRO: 150000,
  ENTERPRISE: 500000
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.systemAdmin.findUnique({ where: { auth_id: user.id } });
    const profile = await prisma.userProfile.findUnique({ where: { auth_id: user.id } });

    let tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      if (profile) tenantId = profile.tenant_id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    if (tenantId === 'SYSTEM' || tenantId === 'default') {
      const defaultPharmacy = await prisma.pharmacy.findFirst();
      if (defaultPharmacy) {
        tenantId = defaultPharmacy.id;
      } else {
        return NextResponse.json({
          plan: 'ENTERPRISE',
          status: 'healthy',
          next_billing_date: 'N/A',
          price: 0,
          usage: {
            pos_transactions: { used: 0, limit: 999999, label: 'Transacciones POS (Este mes)' },
            patients: { used: 0, limit: 999999, label: 'Pacientes en CRM' },
            users: { used: 1, limit: 999999, label: 'Usuarios del equipo' },
            wa_messages: { used: 0, limit: 999999, label: 'Mensajes WhatsApp (Este mes)' },
          }
        });
      }
    }

    // Auth check
    if (!admin && (!profile || (profile.tenant_id !== tenantId && profile.tenant_id !== 'default'))) {
      return NextResponse.json({ error: 'No tienes acceso a este tenant' }, { status: 403 });
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: tenantId } });

    if (!pharmacy) {
      return NextResponse.json({ error: 'Farmacia no encontrada' }, { status: 404 });
    }

    const planType = pharmacy.plan_type as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.STARTER;

    // Get current month start date
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [usersCount, patientsCount, posCount] = await Promise.all([
      prisma.userProfile.count({ where: { tenant_id: tenantId } }),
      prisma.patient.count({ where: { tenant_id: tenantId } }),
      prisma.sale.count({ where: { tenant_id: tenantId, created_at: { gte: startOfMonth } } })
    ]);

    // Next billing date mockup (e.g. 1st of next month)
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    nextBilling.setDate(1);

    return NextResponse.json({
      plan: planType,
      status: pharmacy.status,
      next_billing_date: nextBilling.toLocaleDateString(),
      price: PLAN_PRICES[planType],
      usage: {
        pos_transactions: { used: posCount, limit: limits.pos, label: 'Transacciones POS (Este mes)' },
        patients: { used: patientsCount, limit: limits.patients, label: 'Pacientes en CRM' },
        users: { used: usersCount, limit: limits.users, label: 'Usuarios del equipo' },
        wa_messages: { used: 0, limit: limits.wa, label: 'Mensajes WhatsApp (Este mes)' },
      }
    });

  } catch (error: any) {
    console.error("Billing Info error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
