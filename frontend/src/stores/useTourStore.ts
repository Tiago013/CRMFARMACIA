import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clampStep } from '@/lib/tour/steps';

// Estado del recorrido guiado. Se guarda por pestaña (sessionStorage): el
// recorrido sigue al cambiar de página, pero no reaparece en otra visita.
interface TourState {
  active: boolean;
  step: number;
  minimized: boolean;
  start: () => void;
  go: (step: number) => void;
  setMinimized: (minimized: boolean) => void;
  stop: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      active: false,
      step: 0,
      minimized: false,
      start: () => set({ active: true, step: 0, minimized: false }),
      go: (step) => set({ step: clampStep(step), minimized: false }),
      setMinimized: (minimized) => set({ minimized }),
      stop: () => set({ active: false, step: 0, minimized: false }),
    }),
    { name: 'farmaai-tour', storage: createJSONStorage(() => sessionStorage) },
  ),
);
