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

    const pharmacies = await prisma.pharmacy.findMany({
      orderBy: { created_at: 'desc' }
    });
    
    const tenantsData = pharmacies.map(p => {
      const planPrice = PLAN_PRICES[p.plan_type as keyof typeof PLAN_PRICES] || 0;
      return {
        id: p.id,
        name: p.name,
        plan: p.plan_type,
        mrr: Number(p.mrr_override) || planPrice,
        status: p.status === 'ACTIVE' ? 'healthy' : 'risk',
        lastActive: p.updated_at.toLocaleDateString()
      };
    });

    return NextResponse.json(tenantsData);
  } catch (error: any) {
    console.error("SaaS Tenants fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
