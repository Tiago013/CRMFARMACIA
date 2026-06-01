import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {}
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No user session found' });

    const admin = await prisma.systemAdmin.findUnique({ where: { auth_id: user.id } });
    const profile = await prisma.userProfile.findUnique({ where: { auth_id: user.id } });

    return NextResponse.json({
      auth_id: user.id,
      email: user.email,
      admin: !!admin,
      profile_tenant: profile?.tenant_id,
      role: profile?.role
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
