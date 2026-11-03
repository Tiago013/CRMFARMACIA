// Roles y cuentas demo, compartidos por el servidor y el navegador.

// Roles que pueden modificar catálogo, inventario, compras, gastos y reembolsos
export const ADMIN_ROLES = ['admin', 'regente'];

export function canManage(role: string | null | undefined): boolean {
  return role === 'superadmin' || ADMIN_ROLES.includes(role ?? '');
}

// Cuentas de la demo pública. La contraseña es pública (README) y la
// restauración nocturna la devuelve a este valor.
export const DEMO_PASSWORD = '123456';

export const DEMO_ACCOUNTS = [
  { email: 'demo@farmaai.com', role: 'cajero', label: 'Cajero', description: 'Vende, abre y cierra caja, registra pacientes', readOnly: false },
  { email: 'regente.demo@farmaai.com', role: 'regente', label: 'Regente', description: 'Además gestiona inventario, mermas, compras y reembolsos', readOnly: false },
  { email: 'admin.demo@farmaai.com', role: 'admin', label: 'Administrador', description: 'Ve todo, incluida la configuración, en modo solo lectura', readOnly: true },
] as const;

// Cuentas que pueden mirar pero no escribir (el proxy rechaza POST/PUT/PATCH/DELETE)
export function isReadOnlyAccount(email: string | null | undefined): boolean {
  return DEMO_ACCOUNTS.some(a => a.readOnly && a.email === email?.toLowerCase());
}
