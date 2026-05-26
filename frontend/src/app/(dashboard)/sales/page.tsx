'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, UserPlus, CreditCard, Trash2, Plus, Minus, Tag, Zap, Keyboard, Wifi, WifiOff, Save, FolderOpen, Banknote, HelpCircle, RefreshCw } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';
import { toast } from 'sonner';
import { enqueueSale, getOfflineSales, syncOfflineSales } from '@/lib/offlineQueue';

export default function POSPage() {
  const [cart, setCart] = useState<Array<{id: string, name: string, qty: number, price: number, discount: number}>>([]);
  const [suspendedSales, setSuspendedSales] = useState<Array<{id: string, cart: any[], patient: any}>>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  const [selectedPatient, setSelectedPatient] = useState<{id: string, name: string, refillSuggestion?: string} | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  
  // Checkout states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed' | 'fiado'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Network offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch Inventory
  useEffect(() => {
    const fetchProducts = async () => {
      if (isOffline) return; // In a real app, query IndexedDB here
      try {
        const res = await api.get('/inventory/products', { params: { limit: 50, search: searchQuery } });
        setInventory(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('Error cargando productos:', e);
      }
    };
    const timeout = setTimeout(fetchProducts, 200);
    return () => clearTimeout(timeout);
  }, [searchQuery, isOffline]);

  // Fetch Patients
  useEffect(() => {
    if (!showPatientModal || isOffline) return;
    const fetchPatients = async () => {
      try {
        const res = await api.get('/crm/patients', { params: { limit: 15, search: patientSearch } });
        setPatients(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('Error cargando pacientes:', e);
      }
    };
    const timeout = setTimeout(fetchPatients, 200);
    return () => clearTimeout(timeout);
  }, [showPatientModal, patientSearch, isOffline]);

  const subtotal = cart.reduce((acc, item) => acc + (item.qty * item.price) * (1 - item.discount / 100), 0);
  const taxes = subtotal * 0.19; // Ejemplo IVA 19%
  const total = subtotal + taxes;

  // Keyboard-First Workflow (F1-F10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelpModal(prev => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3' && cart.length > 0) {
        e.preventDefault();
        const lastItem = cart[cart.length - 1];
        applyDiscount(lastItem.id, lastItem.discount === 0 ? 10 : 0);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setShowPatientModal(true);
      } else if (e.key === 'F5' && showCheckoutModal) {
        e.preventDefault();
        setPaymentMethod(prev => prev === 'cash' ? 'card' : prev === 'card' ? 'mixed' : prev === 'mixed' ? 'fiado' : 'cash');
      } else if (e.key === 'F6' && showCheckoutModal && paymentMethod === 'cash') {
        e.preventDefault();
        handleCheckout(); // Pago rápido exacto
      } else if (e.key === 'F7') {
        e.preventDefault();
        if (cart.length > 0) handleSuspendSale();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0 && !showCheckoutModal) {
          setShowCheckoutModal(true);
          setCashReceived(total); // por defecto exacto
        } else if (suspendedSales.length > 0 && cart.length === 0) {
          handleRecoverSale();
        }
      } else if (e.key === 'F9' && cart.length > 0) {
        e.preventDefault();
        removeFromCart(cart[cart.length - 1].id);
      } else if (e.key === 'Escape') {
        setShowPatientModal(false);
        setShowCheckoutModal(false);
        setShowHelpModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showCheckoutModal, suspendedSales, paymentMethod, total]);

  const filteredProducts = inventory;

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
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(1, item.qty + delta) };
      }
      return item;
    }));
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

  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  // Sync effect on network change
  useEffect(() => {
    const handleOnline = async () => {
      setIsSyncing(true);
      try {
        const synced = await syncOfflineSales(api);
        if (synced > 0) {
          toast.success(`Se sincronizaron ${synced} venta(s) pendiente(s)`);
        }
      } finally {
        setIsSyncing(false);
        setOfflineCount(getOfflineSales().length);
      }
    };
    
    // Initial check
    setOfflineCount(getOfflineSales().length);

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const checkoutData = {
      items: cart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.price, discount: i.discount })),
      payments: [{ method: paymentMethod, amount: total }],
      patient_id: selectedPatient?.id,
      session_id: 'SESSION-123',
      idempotency_key: crypto.randomUUID()
    };

    if (isOffline) {
      enqueueSale(checkoutData, checkoutData.idempotency_key);
      setOfflineCount(getOfflineSales().length);
      toast.info("Venta guardada offline. Se sincronizará automáticamente al reconectar.");
      setCart([]);
      setShowCheckoutModal(false);
      setSelectedPatient(null);
      setCashReceived(0);
    } else {
      // Optimistic UI update
      const savedCart = [...cart];
      const savedPatient = selectedPatient;
      const savedCash = cashReceived;
      const savedPaymentMethod = paymentMethod;

      setCart([]);
      setShowCheckoutModal(false);
      setSelectedPatient(null);
      setCashReceived(0);
      
      try {
        const response = await api.post('/pos/checkout', checkoutData);
        toast.success(`¡Venta Procesada! Total: $${total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`);
        // If the backend returned a receipt URL, open it or show it
        if (response.data.receipt_url) {
           // We can open it in a new tab to print, or just log it
           // window.open(response.data.receipt_url, '_blank');
        }
      } catch (error: any) {
        // Rollback on failure
        setCart(savedCart);
        setSelectedPatient(savedPatient);
        setCashReceived(savedCash);
        setPaymentMethod(savedPaymentMethod);
        setShowCheckoutModal(true);
        
        const errorMessage = error?.response?.data?.detail || "Problema de conexión";
        toast.error(`Error procesando pago: ${errorMessage}. Venta revertida.`);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-white dark:bg-[#000000]">
      {/* Left side: Product Search & Quick Items */}
      <div className="flex-1 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#050505] min-w-0">

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Zap className="text-neutral-900 dark:text-white" size={16} /> POS Enterprise Pro
            </h2>
            <div className="flex items-center gap-3">
              {isOffline ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full animate-pulse">
                  <WifiOff size={12} /> Offline
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                  <Wifi size={12} /> Conectado
                </span>
              )}
              
              {offlineCount > 0 && !isSyncing && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                  <Save size={12} /> {offlineCount} en espera
                </span>
              )}
              {isSyncing && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full animate-pulse">
                  <RefreshCw size={12} className="animate-spin" /> Sincronizando
                </span>
              )}

              <button onClick={() => setShowHelpModal(true)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                <HelpCircle size={18} />
              </button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length > 0) {
                  addToCart(filteredProducts[0]);
                }
              }}
              placeholder="Escanear código o buscar producto (Enter para rápido) [F2]" 
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm focus:border-indigo-500 outline-none transition-colors placeholder:text-neutral-400"
              autoFocus
            />
          </div>
          
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded text-neutral-500 font-medium">F2 Buscar</span>
            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded text-neutral-500 font-medium">F4 Cliente</span>
            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded text-neutral-500 font-medium">F7 Suspender</span>
            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded text-neutral-500 font-medium">F8 Cobrar/Recuperar</span>
            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded text-neutral-500 font-medium">F9 Anular</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p: any) => {
              const isExpiring = (p.total_stock || 0) > 0 && parseInt(p.sku?.replace(/\D/g, '') || '0') % 5 === 0;
              return (
                <button 
                  key={p.id} 
                  onClick={() => addToCart(p)}
                  className={`flex flex-col items-start p-3 bg-white dark:bg-[#0A0A0A] border rounded-md transition-colors text-left group ${isExpiring ? 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500'}`}
                >
                  <div className="flex justify-between w-full mb-1">
                    <span className="text-[10px] font-medium text-neutral-500">{p.sku}</span>
                    <span className={`text-[10px] font-bold ${(p.total_stock || 0) < 5 ? 'text-red-500' : 'text-neutral-500'}`}>
                      Stock: {p.total_stock || 0}
                    </span>
                  </div>
                  {isExpiring && <span className="text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 py-0.5 rounded font-bold mb-1">PRÓXIMO A VENCER (FEFO)</span>}
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 text-sm mt-1 truncate w-full">{p.brand_name}</span>
                  <span className="mt-2 font-semibold text-neutral-900 dark:text-white text-sm">${(p.unit_price || 0).toLocaleString('es-CO')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right side: Current Sale (Cart) */}
      <div className="w-full md:w-[400px] flex flex-col bg-[#FDFDFD] dark:bg-[#050505] shrink-0">
        
        {/* Customer Assignment */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#0A0A0A]">
          <div className="flex items-center space-x-3 text-neutral-600 dark:text-neutral-400">
            <div className={`p-2 rounded-full ${selectedPatient ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' : 'bg-neutral-100 dark:bg-neutral-900'}`}>
              <UserPlus size={16} />
            </div>
            <div className="flex flex-col">
              <span className={`text-sm ${selectedPatient ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-500 font-medium"}`}>
                {selectedPatient ? selectedPatient.name : 'Venta Mostrador [F4]'}
              </span>
              {selectedPatient?.refillSuggestion && (
                 <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold tracking-wide">💡 Refill Sugerido: {selectedPatient.refillSuggestion}</span>
              )}
            </div>
          </div>
          {selectedPatient && (
            <button onClick={() => setSelectedPatient(null)} className="text-xs text-red-500 hover:underline">Quitar</button>
          )}
        </div>

        {/* Suspended Sales Indicator */}
        {suspendedSales.length > 0 && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900 flex justify-between items-center text-xs">
            <span className="text-blue-700 dark:text-blue-400 font-medium">{suspendedSales.length} venta(s) en espera</span>
            <button onClick={handleRecoverSale} className="bg-white dark:bg-[#111111] border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-2 py-1 rounded shadow-sm font-semibold hover:bg-blue-100 transition-colors">
              Recuperar (F8)
            </button>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white dark:bg-[#000000]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-3">
              <ShoppingCart size={32} className="opacity-30 mb-2" />
              <p className="text-sm font-medium">Carrito vacío</p>
              <p className="text-xs opacity-70">Escanea un producto o presiona F2</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={item.id} className="flex flex-col p-3 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400 font-mono w-4">{index + 1}.</span>
                    <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">{item.name}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => applyDiscount(item.id, item.discount === 0 ? 15 : 0)} className={`text-xs ${item.discount > 0 ? 'text-indigo-500' : 'text-neutral-400 hover:text-indigo-500'} transition-colors`} title="Descuento (F3)">
                      <Tag size={14} />
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="text-neutral-400 hover:text-red-500 transition-colors" title="Anular (F9 al último)">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between ml-6">
                  <div className="flex items-center bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md">
                    <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-xs font-bold py-1.5">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-500 font-medium">
                       ${item.price.toLocaleString('es-CO', { maximumFractionDigits: 0 })} c/u {item.discount > 0 && <span className="text-indigo-500 ml-1">-{item.discount}%</span>}
                    </div>
                    <div className="font-bold text-sm text-neutral-900 dark:text-white">${((item.price * item.qty) * (1 - item.discount / 100)).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#0A0A0A]">
          <div className="space-y-2 mb-5 text-sm font-medium">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal gravado</span>
              <span>${subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>IVA (19%)</span>
              <span>${taxes.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-900 dark:text-white font-bold text-base">Total a Pagar</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">${total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleSuspendSale}
              disabled={cart.length === 0}
              className="flex-1 flex flex-col items-center justify-center bg-neutral-100 dark:bg-[#111111] disabled:opacity-50 text-neutral-700 dark:text-neutral-300 py-2.5 rounded-lg text-xs font-bold transition-colors border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200"
            >
              <Save size={16} className="mb-1" />
              <span>Suspender (F7)</span>
            </button>
            <button 
              onClick={() => { setShowCheckoutModal(true); setCashReceived(total); }}
              disabled={cart.length === 0}
              className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 text-white py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm hover:bg-indigo-700"
            >
              <CreditCard size={18} />
              <span>COBRAR (F8)</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Checkout Enterprise */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Orquestador de Pagos</h3>
                <p className="text-xs text-neutral-500">Selecciona el método de pago [F5]</p>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6 bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900">
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">TOTAL A COBRAR</p>
                <p className="text-5xl font-black text-neutral-900 dark:text-white tracking-tight">${total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                  { id: 'cash', icon: '💵', label: 'Efectivo' },
                  { id: 'card', icon: '💳', label: 'Tarjeta' },
                  { id: 'mixed', icon: '🔄', label: 'Mixto' },
                  { id: 'fiado', icon: '📝', label: 'Fiado' }
                ].map(method => (
                  <button 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${paymentMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
                  >
                    <span className="text-2xl mb-1">{method.icon}</span>
                    <span className="text-[10px] font-bold uppercase">{method.label}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">EFECTIVO RECIBIDO</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                      <input 
                        type="number" 
                        value={cashReceived}
                        onChange={(e) => setCashReceived(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 text-lg font-bold bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-neutral-50 dark:bg-[#111111] rounded-lg border border-neutral-200 dark:border-neutral-800">
                    <span className="font-bold text-neutral-600 dark:text-neutral-400">CAMBIO A DEVOLVER:</span>
                    <span className={`text-xl font-black ${cashReceived >= total ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      ${Math.max(0, cashReceived - total).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'fiado' && !selectedPatient && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-400 mb-6 font-medium">
                  ⚠️ Error: Debes asignar un paciente (F4) para registrar una cuenta por cobrar (Fiado).
                </div>
              )}

              <button 
                onClick={handleCheckout} 
                disabled={paymentMethod === 'cash' && cashReceived < total || (paymentMethod === 'fiado' && !selectedPatient)}
                className="w-full py-4 bg-indigo-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 text-white rounded-lg text-lg font-black tracking-wide shadow-lg hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
              >
                CONFIRMAR PAGO <span className="text-sm opacity-80 ml-2 font-normal">(Enter o F6)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Shortcuts Help (F1) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-xl shadow-2xl w-full max-w-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between">
              <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Keyboard size={18} /> Atajos de Teclado POS Pro
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="text-neutral-500 hover:text-neutral-900">&times;</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F1</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Ayuda</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F2</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Buscar / Escanear Código</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F3</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Descuento al último ítem</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F4</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Asignar Cliente</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F5</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Cambiar método pago</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F6</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Pago rápido exacto (Efectivo)</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F7</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Suspender Venta actual</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F8</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Cobrar / Recuperar Suspendida</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">F9</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Anular último ítem</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="font-bold text-indigo-600">Esc</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">Cancelar / Cerrar Modales</span>
              </div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-400 text-center font-medium border-t border-amber-200 dark:border-amber-900/50">
              💡 Un cajero experto usa estos atajos para cobrar en menos de 5 segundos sin tocar el mouse.
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Buscar Paciente (Manteniendo la estructura básica existente) */}
      {showPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Asignar Paciente</h3>
              <button onClick={() => setShowPatientModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Buscar por nombre o cédula..." className="w-full pl-8 pr-3 py-1.5 bg-neutral-100 dark:bg-[#111111] border-none rounded-md text-sm outline-none" autoFocus />
              </div>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-48 overflow-y-auto">
                {patients.map((p: any) => (
                  <li 
                    key={p.id}
                    onClick={() => { setSelectedPatient({ id: p.id, name: `${p.first_name} ${p.last_name}`, refillSuggestion: p.preferences?.medicamentos?.split(';')[0] || '' }); setShowPatientModal(false); setPatientSearch(''); }}
                    className="py-2.5 px-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer rounded-md flex justify-between items-center group"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white">{p.first_name} {p.last_name}</span>
                      <span className="text-[10px] text-neutral-400">CC {p.document_id} · {p.phone}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
