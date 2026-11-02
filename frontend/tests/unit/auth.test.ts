import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

// Simula Supabase, Prisma y los headers de Next para probar requireAuth sin red
const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  admin: null as null | object,
  profile: null as null | { id: string; tenant_id: string; role: string },
  pharmacies: new Set<string>(),
  cookies: new Map<string, string>(),
  headers: new Map<string, string>(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () =>
        state.user ? { data: { user: state.user }, error: null } : { data: { user: null }, error: new Error('sin sesión') },
    },
  }),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [...state.cookies].map(([name, value]) => ({ name, value })),
    get: (name: string) => (state.cookies.has(name) ? { value: state.cookies.get(name) } : undefined),
    set: () => {},
  }),
  headers: async () => ({ get: (name: string) => state.headers.get(name) ?? null }),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    systemAdmin: { findUnique: async () => state.admin },
    userProfile: { findUnique: async () => state.profile },
    pharmacy: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.pharmacies.has(where.id) ? { id: where.id } : null,
    },
  },
}));

import { ADMIN_ROLES, IMPERSONATE_COOKIE, requireAuth } from '@/lib/auth';

async function statusOf(result: unknown) {
  expect(result).toBeInstanceOf(NextResponse);
  return (result as NextResponse).status;
}

beforeEach(() => {
  state.user = { id: 'auth-1', email: 'cajero@demo.co' };
  state.admin = null;
  state.profile = { id: 'prof-1', tenant_id: 'farmacia-a', role: 'cajero' };
  state.pharmacies = new Set(['farmacia-a', 'farmacia-b']);
  state.cookies.clear();
  state.headers.clear();
});

describe('requireAuth: usuarios de una farmacia', () => {
  it('sin sesión responde 401', async () => {
    state.user = null;
    expect(await statusOf(await requireAuth())).toBe(401);
  });

  it('sin perfil asociado responde 403', async () => {
    state.profile = null;
    expect(await statusOf(await requireAuth())).toBe(403);
  });

  it('el tenant sale del perfil, no del cliente', async () => {
    state.headers.set('x-tenant-id', 'farmacia-b');
    state.cookies.set(IMPERSONATE_COOKIE, 'farmacia-b');
    const auth = await requireAuth();
    expect(auth).toMatchObject({ tenantId: 'farmacia-a', role: 'cajero', isSuperAdmin: false });
  });

  it('un cajero recibe 403 en acciones de administrador', async () => {
    expect(await statusOf(await requireAuth({ roles: ADMIN_ROLES }))).toBe(403);
  });

  it.each(ADMIN_ROLES)('el rol %s pasa las acciones de administrador', async (role) => {
    state.profile = { id: 'prof-2', tenant_id: 'farmacia-a', role };
    expect(await requireAuth({ roles: ADMIN_ROLES })).toMatchObject({ role, tenantId: 'farmacia-a' });
  });
});

describe('requireAuth: superadmin', () => {
  beforeEach(() => {
    state.admin = { auth_id: 'auth-1' };
    state.profile = null;
  });

  it('opera sobre la farmacia de la cookie de suplantación', async () => {
    state.cookies.set(IMPERSONATE_COOKIE, 'farmacia-b');
    expect(await requireAuth({ roles: ADMIN_ROLES })).toMatchObject({
      tenantId: 'farmacia-b',
      role: 'superadmin',
      isSuperAdmin: true,
    });
  });

  it('acepta el header x-tenant-id', async () => {
    state.headers.set('x-tenant-id', 'farmacia-a');
    expect(await requireAuth()).toMatchObject({ tenantId: 'farmacia-a' });
  });

  it('sin farmacia elegida responde 400', async () => {
    expect(await statusOf(await requireAuth())).toBe(400);
  });

  it('el tenant SYSTEM no es una farmacia', async () => {
    state.cookies.set(IMPERSONATE_COOKIE, 'SYSTEM');
    expect(await statusOf(await requireAuth())).toBe(400);
  });

  it('una farmacia inexistente responde 404', async () => {
    state.cookies.set(IMPERSONATE_COOKIE, 'no-existe');
    expect(await statusOf(await requireAuth())).toBe(404);
  });
});
