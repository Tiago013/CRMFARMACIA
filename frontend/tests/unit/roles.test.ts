import { describe, expect, it } from 'vitest';
import { ADMIN_ROLES, DEMO_ACCOUNTS, canManage, isReadOnlyAccount } from '@/lib/roles';
import { ADMIN_ROLES as SERVER_ADMIN_ROLES } from '@/lib/auth';

describe('canManage', () => {
  it.each(['admin', 'regente', 'superadmin'])('%s puede gestionar', (role) => {
    expect(canManage(role)).toBe(true);
  });

  it.each(['cajero', '', null, undefined])('%s no puede gestionar', (role) => {
    expect(canManage(role)).toBe(false);
  });

  it('el servidor y el navegador usan la misma lista de roles', () => {
    expect(SERVER_ADMIN_ROLES).toBe(ADMIN_ROLES);
  });
});

describe('cuentas demo', () => {
  it('solo el administrador demo es de solo lectura', () => {
    expect(isReadOnlyAccount('admin.demo@farmaai.com')).toBe(true);
    expect(isReadOnlyAccount('ADMIN.DEMO@farmaai.com')).toBe(true);
    expect(isReadOnlyAccount('demo@farmaai.com')).toBe(false);
    expect(isReadOnlyAccount('regente.demo@farmaai.com')).toBe(false);
    expect(isReadOnlyAccount(null)).toBe(false);
  });

  it('el administrador real no queda en solo lectura', () => {
    expect(isReadOnlyAccount('admin@farmaai.com')).toBe(false);
  });

  it('hay una cuenta por rol', () => {
    expect(DEMO_ACCOUNTS.map(a => a.role)).toEqual(['cajero', 'regente', 'admin']);
  });
});
