import { useEffect, useRef } from 'react';

type Shortcuts = {
  hasItems: boolean;
  checkoutOpen: boolean;
  isCashPayment: boolean;
  hasSuspended: boolean;
  toggleHelp: () => void;
  focusSearch: () => void;
  toggleLastDiscount: () => void;
  openPatient: () => void;
  cyclePayment: () => void;
  quickPay: () => void;
  suspend: () => void;
  openCheckout: () => void;
  recover: () => void;
  removeLast: () => void;
  toggleDrawer: () => void;
  closeAll: () => void;
};

// Flujo con teclado (F1–F10, Esc). Siempre usa los handlers del último render.
export function usePosShortcuts(shortcuts: Shortcuts) {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = latest.current;
      const run = (fn: () => void) => { e.preventDefault(); fn(); };

      if (e.key === 'F1') run(s.toggleHelp);
      else if (e.key === 'F2') run(s.focusSearch);
      else if (e.key === 'F3' && s.hasItems) run(s.toggleLastDiscount);
      else if (e.key === 'F4') run(s.openPatient);
      else if (e.key === 'F5' && s.checkoutOpen) run(s.cyclePayment);
      else if (e.key === 'F6' && s.checkoutOpen && s.isCashPayment) run(s.quickPay); // Pago rápido exacto
      else if (e.key === 'F7') run(() => { if (s.hasItems) s.suspend(); });
      else if (e.key === 'F8') {
        run(() => {
          if (s.hasItems && !s.checkoutOpen) s.openCheckout();
          else if (s.hasSuspended && !s.hasItems) s.recover();
        });
      } else if (e.key === 'F9' && s.hasItems) run(s.removeLast);
      else if (e.key === 'F10') run(s.toggleDrawer);
      else if (e.key === 'Escape') s.closeAll();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
