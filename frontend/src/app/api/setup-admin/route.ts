import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Debes estar logueado primero para convertirte en admin. Ve a /login, entra y luego regresa a esta URL.' }, { status: 401 });
    }

    const existingAdmin = await prisma.systemAdmin.findUnique({
      where: { auth_id: user.id }
    });

    if (existingAdmin) {
      return NextResponse.json({ message: '¡Ya eres Super Admin! Ve a /admin-login e ingresa.' });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { auth_id: user.id }
    });

    await prisma.systemAdmin.create({
      data: {
        auth_id: user.id,
        email: user.email || 'admin@farmaai.com',
        first_name: profile?.first_name || 'Admin',
        last_name: profile?.last_name || 'User'
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: '¡Felicidades! Acabo de registrarte como Super Admin en la base de datos. Ahora ve a /admin-login e inicia sesión.' 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
