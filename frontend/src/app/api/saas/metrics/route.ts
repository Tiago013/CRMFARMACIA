import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    const adminCheck = await prisma.systemAdmin.findUnique({ where: { auth_id: user.id } });
    if (!adminCheck) return NextResponse.json({ error: 'Acceso Denegado' }, { status: 403 });

    // Fetch all pharmacies to calculate metrics
    const pharmacies = await prisma.pharmacy.findMany();
    
    let mrr = 0;
    let starterCount = 0;
    let proCount = 0;
    let enterpriseCount = 0;
    let activeCount = 0;

    pharmacies.forEach(p => {
      if (p.status === 'ACTIVE') {
        activeCount++;
        const planPrice = PLAN_PRICES[p.plan_type as keyof typeof PLAN_PRICES] || 0;
        mrr += Number(p.mrr_override) || planPrice;

        if (p.plan_type === 'STARTER') starterCount++;
        else if (p.plan_type === 'PRO') proCount++;
        else if (p.plan_type === 'ENTERPRISE') enterpriseCount++;
      }
    });

    const arpu = activeCount > 0 ? mrr / activeCount : 0;
    const total_transactions = await prisma.sale.count();
    // Usuarios de farmacias que iniciaron sesión en los últimos 30 días (Supabase Auth)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const [{ count: mau }] = await prisma.$queryRaw<{ count: number }[]>`
      select count(*)::int as count from auth.users u
      join public.user_profiles p on p.auth_id = u.id::text
      where u.last_sign_in_at >= ${thirtyDaysAgo}`;
    // Farmacias activas que registraron al menos una venta en 30 días
    const sellingTenants = await prisma.sale.groupBy({ by: ['tenant_id'], where: { created_at: { gte: thirtyDaysAgo } } });

    // Tendencias: farmacias activas que ya existían al iniciar el mes contra las de hoy
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const priceOf = (p: typeof pharmacies[number]) => Number(p.mrr_override) || PLAN_PRICES[p.plan_type as keyof typeof PLAN_PRICES] || 0;
    const activeAtMonthStart = pharmacies.filter(p => p.status === 'ACTIVE' && p.created_at < monthStart);
    const mrrAtMonthStart = activeAtMonthStart.reduce((acc, p) => acc + priceOf(p), 0);
    const arpuAtMonthStart = activeAtMonthStart.length ? mrrAtMonthStart / activeAtMonthStart.length : 0;
    const pct = (now: number, before: number) => {
      if (before === 0) return now > 0 ? 'nuevo' : '0%';
      const v = ((now - before) / before) * 100;
      return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
    };
    const mrrTrend = pct(mrr, mrrAtMonthStart);
    const newThisMonth = pharmacies.filter(p => p.created_at >= monthStart).length;
    const tenantsTrend = `+${newThisMonth} este mes`;
    const arpuTrend = pct(arpu, arpuAtMonthStart);

    // LTV estimado con una vida media supuesta de 24 meses; el CAC no se mide (no hay gasto de adquisición registrado)
    const estimatedLTV = arpu > 0 ? (arpu * 24) : 0;
    const estimatedCAC = 0;

    return NextResponse.json({
      mrr: mrr,
      arpu: arpu,
      net_mrr_growth: Math.round(mrr - mrrAtMonthStart).toLocaleString('es-CO'),
      trends: {
        mrr: mrrTrend,
        tenants: tenantsTrend,
        arpu: arpuTrend,
        churn: "0%"
      },
      unit_economics: {
        cac: estimatedCAC,
        ltv: estimatedLTV
      },
      tenants: {
        total_active: activeCount,
        starter: starterCount,
        pro: proCount,
        enterprise: enterpriseCount,
        churn_rate_percent: 0
      },
      usage: {
        total_transactions: total_transactions,
        selling_tenants_percent: activeCount ? Math.round((sellingTenants.length / activeCount) * 100) : 0,
        mau: mau
      }
    });
  } catch (error: any) {
    console.error("SaaS Metrics fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
