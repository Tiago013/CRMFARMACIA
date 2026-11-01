import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import prisma from '@/lib/prisma';
import { IMPERSONATE_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    const adminCheck = await prisma.systemAdmin.findUnique({ where: { auth_id: user.id } });
    if (!adminCheck) return NextResponse.json({ error: 'Acceso Denegado' }, { status: 403 });

    const body = await request.json();
    const { tenant_id } = body;

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: tenant_id }
    });

    if (!pharmacy) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

    // El tenant suplantado se guarda en una cookie httpOnly que solo el servidor lee
    // (requireAuth la acepta únicamente si el usuario es superadmin).
    console.info(`[impersonate] admin=${user.id} tenant=${pharmacy.id}`);
    const response = NextResponse.json({
      success: true,
      impersonated_tenant_id: pharmacy.id,
      impersonated_tenant_name: pharmacy.name,
      message: `Ahora estás suplantando a ${pharmacy.name}`
    });
    response.cookies.set(IMPERSONATE_COOKIE, pharmacy.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 2, // 2 horas
    });
    return response;
  } catch (error: any) {
    console.error("Impersonate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(IMPERSONATE_COOKIE);
  return response;
}
