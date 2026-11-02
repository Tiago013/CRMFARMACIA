import { useEffect, useState } from 'react';
import { Denominations, DrawerMode, DrawerStatus, EMPTY_DENOMINATIONS, OPENING_DENOMINATIONS, denominationsTotal } from './types';

// Estado de la caja (apertura, ventas en efectivo, cierre). Hoy vive en el
// navegador; la fase 2 del plan lo pasa a la base de datos.
export function useCashDrawer() {
  const [drawerStatus, setDrawerStatus] = useState<DrawerStatus>('closed');
  const [drawerBase, setDrawerBase] = useState(0);
  const [drawerSales, setDrawerSales] = useState(0);
  const [drawerCashIn, setDrawerCashIn] = useState(0);
  const [drawerCashOut, setDrawerCashOut] = useState(0);
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('open');
  const [denominations, setDenominations] = useState<Denominations>(EMPTY_DENOMINATIONS);

  useEffect(() => {
    const savedStatus = localStorage.getItem('drawerStatus');
    if (savedStatus) {
      setDrawerStatus(savedStatus as DrawerStatus);
      setDrawerBase(Number(localStorage.getItem('drawerBase')) || 0);
      setDrawerSales(Number(localStorage.getItem('drawerSales')) || 0);
      setDrawerCashIn(Number(localStorage.getItem('drawerCashIn')) || 0);
      setDrawerCashOut(Number(localStorage.getItem('drawerCashOut')) || 0);
    }
  }, []);

  const saveDrawerState = (status: DrawerStatus, base: number, sales: number, cashIn = 0, cashOut = 0) => {
    localStorage.setItem('drawerStatus', status);
    localStorage.setItem('drawerBase', base.toString());
    localStorage.setItem('drawerSales', sales.toString());
    localStorage.setItem('drawerCashIn', cashIn.toString());
    localStorage.setItem('drawerCashOut', cashOut.toString());
    setDrawerStatus(status);
    setDrawerBase(base);
    setDrawerSales(sales);
    setDrawerCashIn(cashIn);
    setDrawerCashOut(cashOut);
  };

  // Abre el modal de apertura o de cierre según el estado actual
  const openDrawerModal = (mode: DrawerMode = drawerStatus === 'open' ? 'close' : 'open') => {
    setDrawerMode(mode);
    setDenominations(mode === 'open' ? OPENING_DENOMINATIONS : EMPTY_DENOMINATIONS);
    setShowDrawerModal(true);
  };

  // Suma una venta en efectivo al turno
  const registerCashSale = (total: number, cashReceived: number) => {
    saveDrawerState('open', drawerBase, drawerSales + total, drawerCashIn + cashReceived, drawerCashOut + (cashReceived - total));
  };

  return {
    drawerStatus,
    drawerBase,
    drawerSales,
    drawerCashIn,
    drawerCashOut,
    drawerMode,
    denominations,
    setDenominations,
    declaredTotal: denominationsTotal(denominations),
    showDrawerModal,
    setShowDrawerModal,
    openDrawerModal,
    saveDrawerState,
    registerCashSale,
  };
}

export type CashDrawer = ReturnType<typeof useCashDrawer>;
