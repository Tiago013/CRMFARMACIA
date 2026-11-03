'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Compass, Minus, X } from 'lucide-react';
import { TOUR_STEPS, menuPath } from '@/lib/tour/steps';
import { useTourStore } from '@/stores/useTourStore';

// Tarjeta flotante del recorrido: abre la página de cada paso y resalta su
// entrada del menú. Se puede minimizar para usar la pantalla sin estorbo.
export function GuidedTour() {
  const { active, step, minimized, go, setMinimized, stop } = useTourStore();
  const router = useRouter();
  const pathname = usePathname();
  const current = TOUR_STEPS[step];

  // Ir a la página del paso
  useEffect(() => {
    if (active && pathname !== menuPath(current.href)) router.push(current.href);
    // Solo al cambiar de paso: si el visitante navega por su cuenta, no se le devuelve
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  // Resaltar la entrada del menú del paso
  useEffect(() => {
    if (!active) return;
    const link = document.querySelector<HTMLElement>(`aside a[href="${menuPath(current.href)}"]`);
    if (!link) return;
    link.style.outline = '2px solid rgb(99 102 241)';
    link.style.outlineOffset = '2px';
    return () => { link.style.outline = ''; link.style.outlineOffset = ''; };
  }, [active, current, pathname]);

  if (!active) return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 left-4 md:left-[17rem] z-[60] flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
      >
        <Compass size={16} /> Recorrido {step + 1}/{TOUR_STEPS.length}
      </button>
    );
  }

  const last = step === TOUR_STEPS.length - 1;

  return (
    <section
      role="dialog"
      aria-label="Recorrido guiado"
      className="fixed bottom-4 left-4 right-4 md:right-auto md:left-[17rem] md:w-[360px] z-[60] rounded-xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-[#111] shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <Compass size={14} /> Recorrido guiado · {step + 1} de {TOUR_STEPS.length}
        </span>
        <div className="flex items-center gap-1 text-neutral-400">
          <button onClick={() => setMinimized(true)} className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200" aria-label="Minimizar recorrido"><Minus size={16} /></button>
          <button onClick={stop} className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200" aria-label="Cerrar recorrido"><X size={16} /></button>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2">
        <h2 className="font-bold text-neutral-900 dark:text-white">{current.title}</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{current.body}</p>
        <p className="mt-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-sm text-indigo-900 dark:text-indigo-200">
          <strong>Pruébalo:</strong> {current.tryIt}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1" aria-hidden>
            {TOUR_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-4 rounded-full ${i <= step ? 'bg-indigo-500' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => go(step - 1)} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                <ChevronLeft size={16} /> Atrás
              </button>
            )}
            <button
              onClick={() => (last ? stop() : go(step + 1))}
              className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {last ? 'Terminar' : <>Siguiente <ChevronRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
