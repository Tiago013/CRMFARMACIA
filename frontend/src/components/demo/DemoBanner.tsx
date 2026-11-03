'use client';

import { useEffect, useState } from 'react';
import { Compass, Info } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTourStore } from '@/stores/useTourStore';
import { DEMO_ACCOUNTS } from '@/lib/roles';

// Franja discreta para las cuentas demo: aclara que los datos son ficticios y
// ofrece el recorrido guiado.
export function DemoBanner() {
  const email = useAuthStore((s) => s.user?.email?.toLowerCase());
  const { active, start } = useTourStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // "Probar la demo" en la página de inicio llega con ?tour=1
    const url = new URL(window.location.href);
    if (url.searchParams.get('tour') === '1') {
      useTourStore.getState().start();
      url.searchParams.delete('tour');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  if (!mounted || !DEMO_ACCOUNTS.some((a) => a.email === email)) return null;

  return (
    <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 px-4 py-1.5 text-xs text-indigo-900 dark:text-indigo-200 shrink-0">
      <span className="flex items-center gap-1.5">
        <Info size={13} aria-hidden /> Demo con datos ficticios · se restauran cada noche a las 3:00 a. m.
      </span>
      {!active && (
        <button onClick={start} className="flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-indigo-700 dark:hover:text-white">
          <Compass size={13} aria-hidden /> Hacer el recorrido guiado (2 min)
        </button>
      )}
    </div>
  );
}
