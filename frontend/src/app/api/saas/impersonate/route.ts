import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import prisma from '@/lib/prisma';

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

    // En un sistema real, aquí generaríamos un JWT firmado con el tenant_id.
    // Para este MVP, solo devolvemos los datos para que Zustand los asuma.
    return NextResponse.json({
      success: true,
      impersonated_tenant_id: pharmacy.id,
      impersonated_tenant_name: pharmacy.name,
      message: `Ahora estás suplantando a ${pharmacy.name}`
    });
  } catch (error: any) {
    console.error("Impersonate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
