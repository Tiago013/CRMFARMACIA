import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import prisma from '@/lib/prisma';

export const IMPERSONATE_COOKIE = 'fa_impersonate_tenant';

export type AuthContext = {
  authId: string;
  email: string | null;
  profileId: string | null;
  tenantId: string;
  role: string;
  isSuperAdmin: boolean;
};

type RequireAuthOptions = {
  // Roles de tenant permitidos. Un superadmin siempre pasa.
  roles?: string[];
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Valida la sesión de Supabase (getUser verifica el JWT contra Supabase)
 * y resuelve el tenant SIEMPRE desde la base de datos, nunca desde el cliente.
 *
 * - Usuario normal: tenant = userProfile.tenant_id
 * - Superadmin: tenant = cookie httpOnly de suplantación o header X-Tenant-ID
 *   (solo se acepta para superadmins y se verifica que el tenant exista)
 *
 * Devuelve el contexto o un NextResponse de error listo para retornar.
 */
export async function requireAuth(options: RequireAuthOptions = {}): Promise<AuthContext | NextResponse> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // El middleware se encarga de refrescar la sesión.
          }
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return jsonError('No autorizado', 401);

  const [admin, profile] = await Promise.all([
    prisma.systemAdmin.findUnique({ where: { auth_id: user.id } }),
    prisma.userProfile.findUnique({ where: { auth_id: user.id } }),
  ]);

  const isSuperAdmin = !!admin;

  if (isSuperAdmin) {
    const headerStore = await headers();
    const requested =
      cookieStore.get(IMPERSONATE_COOKIE)?.value ||
      headerStore.get('x-tenant-id') ||
      profile?.tenant_id ||
      null;

    if (!requested || requested === 'SYSTEM') {
      return jsonError('Selecciona una farmacia para operar como superadmin', 400);
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: requested }, select: { id: true } });
    if (!pharmacy) return jsonError('Farmacia no encontrada', 404);

    return {
      authId: user.id,
      email: user.email ?? null,
      profileId: profile?.id ?? null,
      tenantId: pharmacy.id,
      role: 'superadmin',
      isSuperAdmin: true,
    };
  }

  if (!profile) return jsonError('Tu usuario no está asociado a ninguna farmacia', 403);

  if (options.roles && !options.roles.includes(profile.role)) {
    return jsonError('No tienes permisos para esta acción', 403);
  }

  return {
    authId: user.id,
    email: user.email ?? null,
    profileId: profile.id,
    tenantId: profile.tenant_id,
    role: profile.role,
    isSuperAdmin: false,
  };
}

export const ADMIN_ROLES = ['admin', 'regente'];
