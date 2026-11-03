'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { canManage, isReadOnlyAccount } from '@/lib/roles';

// null mientras se lee la sesión guardada (evita diferencias entre el HTML del
// servidor y el del navegador); luego, el motivo del bloqueo o 'ok'
function useManageStatus(): 'ok' | 'role' | 'readonly' | null {
  const user = useAuthStore(s => s.user);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (isReadOnlyAccount(user?.email)) return 'readonly';
  return canManage(user?.role) ? 'ok' : 'role';
}

export function useCanManage(): boolean | null {
  const status = useManageStatus();
  return status === null ? null : status === 'ok';
}

const MESSAGES = {
  role: 'Disponible para administradores y regentes',
  readonly: 'Cuenta demo de solo lectura',
};

// Envuelve una acción de administrador. Si el usuario no puede usarla, se ve
// deshabilitada con el motivo; el servidor la rechaza igual (403).
export function AdminOnly({ children, hint = true }: { children: ReactNode; hint?: boolean }) {
  const status = useManageStatus();
  if (status === null || status === 'ok') return <>{children}</>;

  return (
    <span className="relative inline-flex cursor-not-allowed" title={MESSAGES[status]}>
      <span inert className="opacity-40 grayscale">{children}</span>
      {hint && (
        <span className="pointer-events-none absolute -top-2 -right-2 rounded-full bg-neutral-800 p-0.5 text-white shadow" aria-hidden>
          <Lock size={9} />
        </span>
      )}
      <span className="sr-only">{MESSAGES[status]}</span>
    </span>
  );
}
