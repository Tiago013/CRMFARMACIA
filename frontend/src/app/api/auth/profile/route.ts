export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request });
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { auth_id: user.id },
      include: { pharmacy: true }
    });

    if (!profile) {
      // Find a default pharmacy to assign
      const defaultPharmacy = await prisma.pharmacy.findFirst();
      const fallbackTenantId = defaultPharmacy ? defaultPharmacy.id : 'SYSTEM';

      // Default fallback profile if not found in Prisma
      return NextResponse.json({
        id: user.id,
        auth_id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || 'Usuario',
        last_name: user.user_metadata?.last_name || '',
        role: 'admin', // default admin for new manual setups
        tenant_id: fallbackTenantId,
        plan: defaultPharmacy ? defaultPharmacy.plan_type : 'ENTERPRISE'
      });
    }

    return NextResponse.json({
      id: profile.id,
      auth_id: profile.auth_id,
      tenant_id: profile.tenant_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
      email: user.email,
      plan: profile.pharmacy ? profile.pharmacy.plan_type : 'STARTER'
    });
  } catch (error: any) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
