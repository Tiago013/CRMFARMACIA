'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, UserPlus, CreditCard, Trash2, Plus, Minus, Tag, Zap, Keyboard } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';

const MOCK_INVENTORY = [
  { id: '1', name: 'Aspirina 100mg', sku: 'ASP-100', price: 5.50, stock: 150 },
  { id: '2', name: 'Vitamina C', sku: 'VIT-C', price: 12.00, stock: 45 },
  { id: '3', name: 'Losartán 50mg', sku: 'LOS-50', price: 18.50, stock: 8 },
  { id: '4', name: 'Amoxicilina 500mg', sku: 'AMX-500', price: 8.75, stock: 200 },
  { id: '5', name: 'Ibuprofeno 400mg', sku: 'IBU-400', price: 4.20, stock: 120 },
  { id: '6', name: 'Omeprazol 20mg', sku: 'OME-20', price: 9.90, stock: 85 },
];

export default function POSPage() {
  const [cart, setCart] = useState<Array<{id: string, name: string, qty: number, price: number, discount: number}>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{id: string, name: string, refillSuggestion?: string} | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard-First Workflow (F2, F4, F8, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setShowPatientModal(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) setShowCheckoutModal(true);
      } else if (e.key === 'Escape') {
        setShowPatientModal(false);
        setShowCheckoutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const filteredProducts = MOCK_INVENTORY.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = cart.reduce((acc, item) => acc + (item.qty * item.price) * (1 - item.discount / 100), 0);

  const addToCart = (product: typeof MOCK_INVENTORY[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, discount: 0 }];
    });
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      // API call to the new POS Checkout Engine
      await api.post('/pos/checkout', {
        items: cart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.price, discount: i.discount })),
        payments: [{ method: 'cash', amount: subtotal }],
        patient_id: selectedPatient?.id,
        session_id: 'SESSION-123',
        idempotency_key: crypto.randomUUID()
      });
      alert(`¡Venta procesada exitosamente en Backend POS!\nTotal: $${subtotal.toFixed(2)}`);
      setCart([]);
      setShowCheckoutModal(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("Error procesando pago.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-white dark:bg-[#000000]">
      {/* Left side: Product Search & Quick Items */}
      <div className="flex-1 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#050505] min-w-0">

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Zap className="text-neutral-900 dark:text-white" size={16} /> POS Enterprise
            </h2>
            <div className="flex gap-2 text-xs text-neutral-400 font-medium">
              <span className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded"><Keyboard size={12}/> F2 Buscar</span>
              <span className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded"><Keyboard size={12}/> F4 Cliente</span>
              <span className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded"><Keyboard size={12}/> F8 Cobrar</span>
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
              placeholder="Escanear código o buscar producto (Enter para rápido)..." 
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm focus:border-neutral-400 dark:focus:border-neutral-500 outline-none transition-colors placeholder:text-neutral-400"
              autoFocus
            />
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p) => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)}
                className="flex flex-col items-start p-3 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-md hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors text-left group"
              >
                <div className="flex justify-between w-full mb-1">
                  <span className="text-[10px] font-medium text-neutral-500">
                    {p.sku}
                  </span>
                  <span className={`text-[10px] font-medium ${p.stock < 10 ? 'text-red-500' : 'text-neutral-500'}`}>
                    Stock: {p.stock}
                  </span>
                </div>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 text-sm mt-1">{p.name}</span>
                <span className="mt-2 font-semibold text-neutral-900 dark:text-white text-sm">${p.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Current Sale (Cart) */}
      <div className="w-full md:w-[380px] flex flex-col bg-[#FDFDFD] dark:bg-[#050505] shrink-0">
        
        {/* Customer Assignment */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-neutral-600 dark:text-neutral-400">
            <UserPlus size={16} className={selectedPatient ? "text-neutral-900 dark:text-white" : ""} />
            <div className="flex flex-col">
              <span className={`text-sm ${selectedPatient ? "font-medium text-neutral-900 dark:text-white" : "text-neutral-500"}`}>
                {selectedPatient ? selectedPatient.name : 'Sin paciente (F4)'}
              </span>
              {selectedPatient?.refillSuggestion && (
                 <span className="text-[10px] text-amber-500 font-medium">Sugerencia Refill: {selectedPatient.refillSuggestion}</span>
              )}
            </div>
          </div>
          <button 
            onClick={() => setShowPatientModal(true)}
            className="text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-2.5 py-1 rounded-md transition-colors"
          >
            {selectedPatient ? 'Cambiar' : 'Asignar'}
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white dark:bg-[#000000]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-2">
              <ShoppingCart size={24} className="opacity-50" />
              <p className="text-sm">El carrito está vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex flex-col p-3 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-md">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{item.name}</h4>
                  <div className="flex gap-2">
                    {/* Inline Discount */}
                    <button onClick={() => applyDiscount(item.id, item.discount === 0 ? 10 : 0)} className={`text-xs ${item.discount > 0 ? 'text-emerald-500' : 'text-neutral-400 hover:text-emerald-500'} transition-colors`}>
                      <Tag size={14} />
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-md">
                    <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-xs font-medium border-x border-neutral-200 dark:border-neutral-800 py-1">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-500">
                       ${item.price.toFixed(2)} c/u {item.discount > 0 && <span className="text-emerald-500">(-{item.discount}%)</span>}
                    </div>
                    <div className="font-semibold text-sm text-neutral-900 dark:text-white">${((item.price * item.qty) * (1 - item.discount / 100)).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#050505]">
          <div className="space-y-1.5 mb-4 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-900 dark:text-white font-semibold">Total</span>
              <span className="text-lg font-bold text-neutral-900 dark:text-white">${subtotal.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCheckoutModal(true)}
            disabled={cart.length === 0}
            className="w-full flex items-center justify-center space-x-2 bg-neutral-900 dark:bg-white disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 text-white dark:text-black py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <CreditCard size={16} />
            <span>Cobrar Venta (F8)</span>
          </button>
        </div>
      </div>

      {/* MODAL: Buscar Paciente */}
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
                <input type="text" placeholder="Buscar por DNI o Teléfono..." className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm focus:border-neutral-400 outline-none" autoFocus />
              </div>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-48 overflow-y-auto">
                <li 
                  onClick={() => { setSelectedPatient({ id: 'p1', name: 'María Elena Salazar', refillSuggestion: 'Losartán 50mg' }); setShowPatientModal(false); }}
                  className="py-2.5 px-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer rounded-md flex justify-between items-center group"
                >
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white">María Elena Salazar</span>
                  <span className="text-xs text-amber-500">Refill: Losartán</span>
                </li>
                <li 
                  onClick={() => { setSelectedPatient({ id: 'p2', name: 'Carlos Roberto Gómez' }); setShowPatientModal(false); }}
                  className="py-2.5 px-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer rounded-md flex justify-between items-center group"
                >
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white">Carlos Roberto Gómez</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Checkout */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Orquestador de Pagos</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
            </div>
            <div className="p-6 flex flex-col space-y-6">
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-1">Monto a cobrar</p>
                <p className="text-4xl font-bold text-neutral-900 dark:text-white">${subtotal.toFixed(2)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleCheckout} className="flex flex-col items-center justify-center p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <span className="text-2xl mb-2">💵</span>
                  <span className="text-sm font-medium">Efectivo Exacto</span>
                </button>
                <button onClick={handleCheckout} className="flex flex-col items-center justify-center p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                  <span className="text-2xl mb-2">💳</span>
                  <span className="text-sm font-medium">Tarjeta Crédito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
