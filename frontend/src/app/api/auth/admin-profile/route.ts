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

    const profile = await prisma.systemAdmin.findUnique({
      where: { auth_id: user.id }
    });

    if (!profile) {
      // Not a super admin
      return NextResponse.json({ error: 'Acceso Denegado' }, { status: 403 });
    }

    return NextResponse.json({
      ...profile,
      role: 'superadmin',
      tenant_id: 'SYSTEM',
      email: user.email,
      plan: 'ENTERPRISE'
    });
  } catch (error: any) {
    console.error("Admin Profile fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
