import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Denominations, DrawerMode, DrawerStatus, EMPTY_DENOMINATIONS, OPENING_DENOMINATIONS, denominationsTotal } from './types';

type Summary = { opening: number; cashSales: number; expected: number; cashSalesCount?: number };

// Turno de caja guardado en la base (/api/pos/cash-session): la apertura y el
// arqueo quedan registrados y se ven igual desde cualquier navegador.
export function useCashDrawer() {
  const [drawerStatus, setDrawerStatus] = useState<DrawerStatus>('loading');
  const [summary, setSummary] = useState<Summary>({ opening: 0, cashSales: 0, expected: 0 });
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('open');
  const [denominations, setDenominations] = useState<Denominations>(EMPTY_DENOMINATIONS);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/cash-session');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDrawerStatus(data.session ? 'open' : 'closed');
      setSummary(data.summary ?? { opening: 0, cashSales: 0, expected: 0 });
    } catch (e) {
      console.error('Error cargando la caja:', e);
      setDrawerStatus('closed');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Abre el modal de apertura o de cierre según el estado actual
  const openDrawerModal = (mode: DrawerMode = drawerStatus === 'open' ? 'close' : 'open') => {
    setDrawerMode(mode);
    setDenominations(mode === 'open' ? OPENING_DENOMINATIONS : EMPTY_DENOMINATIONS);
    setShowDrawerModal(true);
  };

  // Confirma la apertura o el cierre en el servidor
  const confirmDrawer = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pos/cash-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: drawerMode, denominations }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la caja');

      if (drawerMode === 'open') {
        toast.success(`Caja abierta exitosamente con base de $${data.summary.opening.toLocaleString('es-CO')}`);
      } else {
        const dif = data.summary.difference;
        toast.success(`Turno finalizado. ${dif === 0 ? 'Caja cuadrada' : `${dif > 0 ? 'Sobrante' : 'Faltante'}: $${Math.abs(dif).toLocaleString('es-CO')}`}`, {
          duration: 10000,
          action: { label: 'Reporte Z', onClick: () => { window.location.href = '/transactions?tab=cierre'; } },
        });
      }
      setShowDrawerModal(false);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return {
    drawerStatus,
    drawerBase: summary.opening,
    drawerSales: summary.cashSales,
    expected: summary.expected,
    drawerMode,
    denominations,
    setDenominations,
    declaredTotal: denominationsTotal(denominations),
    showDrawerModal,
    setShowDrawerModal,
    openDrawerModal,
    confirmDrawer,
    saving,
    // Tras una venta en efectivo se recalcula lo esperado en el servidor
    registerCashSale: refresh,
  };
}

export type CashDrawer = ReturnType<typeof useCashDrawer>;
