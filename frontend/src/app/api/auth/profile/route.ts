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
      // Sin perfil no hay farmacia asignada: no se otorga ningún rol por defecto.
      return NextResponse.json({ error: 'Tu usuario no está asociado a ninguna farmacia' }, { status: 403 });
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
