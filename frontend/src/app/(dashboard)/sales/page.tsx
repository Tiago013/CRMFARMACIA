'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { toast } from 'sonner';
import { enqueueSale } from '@/lib/offlineQueue';
import { useSearchParams, useRouter } from 'next/navigation';
import { computeSaleTotals } from '@/lib/pos/pricing';
import { CartItem, PaymentMethod, SelectedPatient, formatCOP } from './_components/types';
import { useCashDrawer } from './_components/useCashDrawer';
import { usePosData } from './_components/usePosData';
import { usePosShortcuts } from './_components/usePosShortcuts';
import { ProductPanel } from './_components/ProductPanel';
import { CartPanel } from './_components/CartPanel';
import { CheckoutModal } from './_components/CheckoutModal';
import { HelpModal } from './_components/HelpModal';
import { PatientModal } from './_components/PatientModal';
import { ClosedDrawerOverlay, DrawerModal } from './_components/DrawerModal';

const toSelectedPatient = (p: any): SelectedPatient => ({
  id: p.id,
  name: `${p.first_name} ${p.last_name}`,
  refillSuggestion: p.preferences?.medicamentos?.split(';')[0] || '',
});

function POSContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [suspendedSales, setSuspendedSales] = useState<Array<{ id: string, cart: CartItem[], patient: SelectedPatient | null }>>([]);

  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);

  // Checkout states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const drawer = useCashDrawer();
  const { inventory, patients, isOffline, isSyncing, offlineCount, refreshOfflineCount } =
    usePosData({ searchQuery, patientSearch, showPatientModal });

  // Parse external AI params
  useEffect(() => {
    const addQuery = searchParams.get('add_query');
    const patientId = searchParams.get('patient_id');

    if (addQuery) {
      setSearchQuery(addQuery);
    }

    if (patientId) {
      fetch(`/api/crm/patients/${patientId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.id) setSelectedPatient(toSelectedPatient(data));
        })
        .catch(console.error);
    }

    if (addQuery || patientId) {
      router.replace('/sales');
    }
  }, [searchParams, router]);

  // Misma función que usa el servidor al cobrar
  const { subtotal, taxTotal: taxes, grandTotal: total, discountTotal } = computeSaleTotals(
    cart.map(item => ({ quantity: item.qty, unitPrice: item.price, discountPct: item.discount }))
  );

  const openCheckout = () => {
    setShowCheckoutModal(true);
    setCashReceived(total); // por defecto exacto
  };

  usePosShortcuts({
    hasItems: cart.length > 0,
    checkoutOpen: showCheckoutModal,
    isCashPayment: paymentMethod === 'cash',
    hasSuspended: suspendedSales.length > 0,
    toggleHelp: () => setShowHelpModal(prev => !prev),
    focusSearch: () => searchInputRef.current?.focus(),
    toggleLastDiscount: () => {
      const lastItem = cart[cart.length - 1];
      applyDiscount(lastItem.id, lastItem.discount === 0 ? 10 : 0);
    },
    openPatient: () => setShowPatientModal(true),
    cyclePayment: () => setPaymentMethod(prev => prev === 'cash' ? 'card' : prev === 'card' ? 'mixed' : prev === 'mixed' ? 'fiado' : 'cash'),
    quickPay: () => handleCheckout(),
    suspend: () => handleSuspendSale(),
    openCheckout,
    recover: () => handleRecoverSale(),
    removeLast: () => removeFromCart(cart[cart.length - 1].id),
    toggleDrawer: () => drawer.openDrawerModal(),
    closeAll: () => {
      setShowPatientModal(false);
      setShowCheckoutModal(false);
      setShowHelpModal(false);
      drawer.setShowDrawerModal(false);
    },
  });

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.brand_name, price: product.unit_price, qty: 1, discount: 0 }];
    });
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };

  const applyDiscount = (id: string, discount: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, discount } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleSuspendSale = () => {
    setSuspendedSales(prev => [...prev, { id: `SUS-${Date.now().toString().slice(-4)}`, cart, patient: selectedPatient }]);
    setCart([]);
    setSelectedPatient(null);
  };

  const handleRecoverSale = () => {
    const sale = suspendedSales[suspendedSales.length - 1];
    setCart(sale.cart);
    setSelectedPatient(sale.patient);
    setSuspendedSales(prev => prev.slice(0, -1));
  };

  const resetSale = () => {
    setCart([]);
    setShowCheckoutModal(false);
    setSelectedPatient(null);
    setCashReceived(0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const items = cart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.price, discount: i.discount }));

    if (isOffline) {
      const idempotencyKey = crypto.randomUUID();
      enqueueSale({
        items,
        payments: [{ method: paymentMethod, amount: total }],
        patient_id: selectedPatient?.id,
        session_id: 'SESSION-123',
        idempotency_key: idempotencyKey,
      }, idempotencyKey);
      refreshOfflineCount();
      toast.info("Venta guardada offline. Se sincronizará automáticamente al reconectar.");
      resetSale();
      return;
    }

    // Optimistic UI update
    const savedCart = [...cart];
    const savedPatient = selectedPatient;
    const savedCash = cashReceived;
    const savedPaymentMethod = paymentMethod;
    resetSale();

    try {
      const response = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          patient_id: savedPatient?.id,
          payment_method: savedPaymentMethod,
          grand_total: total,
          subtotal: subtotal,
          tax_total: taxes,
          discount_total: discountTotal
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error procesando pago');
      }

      if (savedPaymentMethod === 'cash') {
        drawer.registerCashSale(total, savedCash);
      }

      toast.success(`¡Venta Procesada! Total: $${formatCOP(total)}`);
    } catch (error: any) {
      // Rollback on failure
      setCart(savedCart);
      setSelectedPatient(savedPatient);
      setCashReceived(savedCash);
      setPaymentMethod(savedPaymentMethod);
      setShowCheckoutModal(true);

      const errorMessage = error.message || "Problema de conexión";
      toast.error(`Error procesando pago: ${errorMessage}. Venta revertida.`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-white dark:bg-[#000000] relative">
      {/* Overlay de Bloqueo cuando la caja está cerrada */}
      {drawer.drawerStatus === 'closed' && !drawer.showDrawerModal && (
        <ClosedDrawerOverlay onOpen={() => drawer.openDrawerModal('open')} />
      )}

      <ProductPanel
        products={inventory}
        onAdd={addToCart}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        searchInputRef={searchInputRef}
        isOffline={isOffline}
        isSyncing={isSyncing}
        offlineCount={offlineCount}
        drawerStatus={drawer.drawerStatus}
        onToggleDrawer={() => drawer.openDrawerModal()}
        onHelp={() => setShowHelpModal(true)}
      />

      <CartPanel
        cart={cart}
        patient={selectedPatient}
        onClearPatient={() => setSelectedPatient(null)}
        suspendedCount={suspendedSales.length}
        onRecover={handleRecoverSale}
        onDiscount={applyDiscount}
        onRemove={removeFromCart}
        onQty={updateQty}
        subtotal={subtotal}
        taxes={taxes}
        total={total}
        onSuspend={handleSuspendSale}
        onCharge={openCheckout}
      />

      {showCheckoutModal && (
        <CheckoutModal
          total={total}
          paymentMethod={paymentMethod}
          onPaymentMethod={setPaymentMethod}
          cashReceived={cashReceived}
          onCashReceived={setCashReceived}
          hasPatient={!!selectedPatient}
          onClose={() => setShowCheckoutModal(false)}
          onConfirm={handleCheckout}
        />
      )}

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      {showPatientModal && (
        <PatientModal
          patients={patients}
          search={patientSearch}
          onSearch={setPatientSearch}
          onSelect={(p) => { setSelectedPatient(toSelectedPatient(p)); setShowPatientModal(false); setPatientSearch(''); }}
          onClose={() => setShowPatientModal(false)}
        />
      )}

      {drawer.showDrawerModal && <DrawerModal drawer={drawer} />}
    </div>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando POS...</div>}>
      <POSContent />
    </Suspense>
  );
}
