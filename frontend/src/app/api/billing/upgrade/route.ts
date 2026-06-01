import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const PLAN_PRICES = {
  STARTER: 50000,
  PRO: 150000,
  ENTERPRISE: 500000
};

export async function POST(request: NextRequest) {
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
    if (!tenantId && profile) tenantId = profile.tenant_id;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Only allow admin roles to upgrade plans
    const isSuperAdmin = !!admin;
    const isTenantAdmin = profile?.tenant_id === tenantId && (profile.role === 'admin' || profile.role === 'superadmin');
    
    if (!isSuperAdmin && !isTenantAdmin) {
       return NextResponse.json({ error: 'Sólo los administradores pueden cambiar el plan.' }, { status: 403 });
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: tenantId } });
    if (!pharmacy) {
      return NextResponse.json({ error: 'Farmacia no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { new_plan } = body;

    if (!['STARTER', 'PRO', 'ENTERPRISE'].includes(new_plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    const price = PLAN_PRICES[new_plan as keyof typeof PLAN_PRICES];

    // Transaction to update pharmacy and create subscription record
    await prisma.$transaction([
      prisma.pharmacy.update({
        where: { id: tenantId },
        data: { plan_type: new_plan }
      }),
      prisma.subscription.create({
        data: {
          tenant_id: tenantId,
          plan_name: new_plan,
          amount: price,
          status: 'ACTIVE'
        }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      message: `Suscripción actualizada exitosamente al plan ${new_plan}.` 
    });

  } catch (error: any) {
    console.error("Billing upgrade error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
