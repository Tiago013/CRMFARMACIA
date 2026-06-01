'use client';

import { useState, useEffect } from 'react';
import { ArrowRightLeft, Search, ShoppingCart, Plus, RefreshCw, FileText, X, AlertTriangle, Truck, Banknote, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando transacciones...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Modal States
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // New Purchase Form State
  const [newPurchase, setNewPurchase] = useState({
    supplier_id: '',
    invoice_number: '',
    items: [] as any[]
  });
  const [searchQuery, setSearchQuery] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchData();
  }, [activeTab, searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        let url = '/api/transactions/sales?limit=100';
        const filterDate = searchParams.get('date');
        if (filterDate) {
          url += `&date=${filterDate}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setSales(Array.isArray(data) ? data : []);
      } else {
        const [purchasesRes, inventoryRes, suppliersRes] = await Promise.all([
          fetch('/api/transactions/purchases'),
          fetch('/api/inventory/products'),
          fetch('/api/inventory/suppliers') // we will need a generic suppliers endpoint, or mock
        ]);
        const pData = await purchasesRes.json();
        setPurchases(Array.isArray(pData) ? pData : []);
        
        const iData = await inventoryRes.json();
        setInventory(Array.isArray(iData) ? iData : []);
        
        // MVP: Mock suppliers if endpoint fails
        try {
          const sData = await suppliersRes.json();
          setSuppliers(Array.isArray(sData) ? sData : [{id: 'SUPP-1', name: 'Droguería Distribuidora Nacional'}, {id: 'SUPP-2', name: 'Laboratorios MK'}]);
        } catch {
          setSuppliers([{id: 'SUPP-1', name: 'Droguería Distribuidora Nacional'}, {id: 'SUPP-2', name: 'Laboratorios MK'}]);
        }
      }
    } catch (e) {
      console.error('Error fetching data', e);
      toast.error('Error cargando los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (saleId: string) => {
    if (!confirm('¿Estás seguro de que deseas anular esta venta y regresar los productos al inventario?')) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/transactions/sales/${saleId}/refund`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error procesando devolución');
      }
      toast.success('Venta anulada y stock devuelto exitosamente');
      setSelectedSale(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddPurchaseItem = (product: any) => {
    setNewPurchase({
      ...newPurchase,
      items: [...newPurchase.items, {
        product_id: product.id,
        name: product.brand_name,
        quantity: 1,
        unit_cost: product.cost_price || 0,
        batch_number: '',
        expiration_date: ''
      }]
    });
    setSearchQuery('');
  };

  const handleUpdatePurchaseItem = (index: number, field: string, value: any) => {
    const updated = [...newPurchase.items];
    updated[index][field] = value;
    setNewPurchase({ ...newPurchase, items: updated });
  };

  const handleRemovePurchaseItem = (index: number) => {
    const updated = [...newPurchase.items];
    updated.splice(index, 1);
    setNewPurchase({ ...newPurchase, items: updated });
  };

  const submitPurchase = async () => {
    if (!newPurchase.supplier_id) return toast.error('Selecciona un proveedor');
    if (newPurchase.items.length === 0) return toast.error('Agrega al menos un producto');
    
    for (const item of newPurchase.items) {
      if (!item.batch_number || !item.expiration_date || item.quantity <= 0) {
        return toast.error('Todos los productos deben tener lote, fecha de vencimiento y cantidad mayor a 0');
      }
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/transactions/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPurchase)
      });
      if (!res.ok) throw new Error('Error al guardar factura de compra');
      
      toast.success('Compra registrada, inventario y costos actualizados.');
      setShowPurchaseModal(false);
      setNewPurchase({ supplier_id: '', invoice_number: '', items: [] });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredInventory = inventory.filter(p => p.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.includes(searchQuery));

  return (
    <div className="h-full flex flex-col bg-[#FBFBFB] dark:bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-white dark:bg-[#111111] border-b border-neutral-200 dark:border-neutral-800 p-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="text-indigo-600 dark:text-indigo-400" />
              Operaciones (Ventas y Compras)
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Audita el historial de ventas y registra ingresos de mercancía a la farmacia.
            </p>
          </div>
          <div className="flex bg-neutral-100 dark:bg-[#000000] p-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setActiveTab('sales')}
              className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'sales' ? 'bg-white dark:bg-[#222222] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Historial de Ventas
            </button>
            <button 
              onClick={() => setActiveTab('purchases')}
              className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'purchases' ? 'bg-white dark:bg-[#222222] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Compras a Proveedores
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <RefreshCw className="animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              {/* TAB: SALES */}
              {activeTab === 'sales' && (
                <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0A0A0A] flex justify-between items-center">
                    <h2 className="font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                      <Banknote size={16} /> Auditoría de Ventas
                    </h2>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-[#0A0A0A] border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                        <th className="px-6 py-3 font-semibold">Ticket</th>
                        <th className="px-6 py-3 font-semibold">Fecha</th>
                        <th className="px-6 py-3 font-semibold">Cliente</th>
                        <th className="px-6 py-3 font-semibold">Método Pago</th>
                        <th className="px-6 py-3 font-semibold text-right">Total</th>
                        <th className="px-6 py-3 font-semibold text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {sales.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">No hay ventas registradas.</td></tr>
                      ) : sales.map((sale) => (
                        <tr key={sale.id} onClick={() => setSelectedSale(sale)} className="hover:bg-neutral-50 dark:hover:bg-[#1A1A1A] cursor-pointer transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{sale.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{new Date(sale.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                            {sale.patient ? `${sale.patient.first_name} ${sale.patient.last_name}` : 'Venta Mostrador'}
                          </td>
                          <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{sale.payment_method}</td>
                          <td className="px-6 py-4 text-right font-black text-neutral-900 dark:text-white">
                            ${sale.grand_total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {sale.status === 'REFUNDED' ? (
                              <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full text-[10px] font-bold">ANULADA</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold">COMPLETADA</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: PURCHASES */}
              {activeTab === 'purchases' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setShowPurchaseModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 text-sm"
                    >
                      <Plus size={16} /> Registrar Ingreso de Factura (Compra)
                    </button>
                  </div>

                  <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0A0A0A] flex justify-between items-center">
                      <h2 className="font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                        <Truck size={16} /> Historial de Compras
                      </h2>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-neutral-50 dark:bg-[#0A0A0A] border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                          <th className="px-6 py-3 font-semibold">ID Ingreso</th>
                          <th className="px-6 py-3 font-semibold">Fecha</th>
                          <th className="px-6 py-3 font-semibold">Factura</th>
                          <th className="px-6 py-3 font-semibold">Proveedor</th>
                          <th className="px-6 py-3 font-semibold text-center">Ítems</th>
                          <th className="px-6 py-3 font-semibold text-right">Total Costo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {purchases.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">No hay compras registradas.</td></tr>
                        ) : purchases.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-neutral-50 dark:hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{purchase.id.slice(0, 8).toUpperCase()}</td>
                            <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{new Date(purchase.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400 font-medium">#{purchase.invoice_number || 'S/N'}</td>
                            <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">{purchase.supplier?.name}</td>
                            <td className="px-6 py-4 text-center font-bold text-neutral-600 dark:text-neutral-400">{purchase.items.length}</td>
                            <td className="px-6 py-4 text-right font-black text-neutral-900 dark:text-white">
                              ${purchase.total_amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL: Sale Details & Refund */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
              <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FileText size={16} /> Detalle de Venta
              </h3>
              <button onClick={() => setSelectedSale(null)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="flex justify-between mb-4 text-sm bg-neutral-50 dark:bg-[#1A1A1A] p-3 rounded-lg">
                <div>
                  <p className="text-neutral-500">Ticket ID</p>
                  <p className="font-mono font-bold text-neutral-900 dark:text-white">{selectedSale.id.slice(0, 12)}</p>
                </div>
                <div className="text-right">
                  <p className="text-neutral-500">Fecha</p>
                  <p className="font-bold text-neutral-900 dark:text-white">{new Date(selectedSale.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Productos Vendidos</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedSale.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-2 border border-neutral-100 dark:border-neutral-800 rounded">
                      <div>
                        <p className="font-medium text-sm text-neutral-900 dark:text-white">{item.product?.brand_name}</p>
                        <p className="text-xs text-neutral-500">{item.quantity} unds x ${(item.unit_price).toLocaleString('es-CO')}</p>
                      </div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-white">${item.total.toLocaleString('es-CO')}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-lg font-black text-neutral-900 dark:text-white">Total: ${selectedSale.grand_total.toLocaleString('es-CO')}</p>
                
                {selectedSale.status !== 'REFUNDED' && (
                  <button 
                    onClick={() => handleRefund(selectedSale.id)}
                    disabled={processing}
                    className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 px-4 py-2 rounded font-bold text-sm transition-colors"
                  >
                    <AlertTriangle size={14} /> Anular y Devolver Stock
                  </button>
                )}
                {selectedSale.status === 'REFUNDED' && (
                  <span className="text-red-500 font-bold text-sm">Venta Anulada</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nueva Compra (Ingreso) */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden mb-10">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-indigo-50 dark:bg-indigo-950/20">
              <h3 className="font-black text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
                <Truck size={18} /> Registrar Factura de Proveedor
              </h3>
              <button onClick={() => setShowPurchaseModal(false)} className="text-indigo-500 hover:text-indigo-700"><X size={20} /></button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Proveedor</label>
                  <select 
                    value={newPurchase.supplier_id}
                    onChange={(e) => setNewPurchase({...newPurchase, supplier_id: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Selecciona un proveedor...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Nº de Factura</label>
                  <input 
                    type="text" 
                    value={newPurchase.invoice_number}
                    onChange={(e) => setNewPurchase({...newPurchase, invoice_number: e.target.value})}
                    placeholder="Ej. F-102938"
                    className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="block text-xs font-bold text-neutral-500 mb-2">Buscar Producto para Ingresar</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nombre o SKU..."
                      className="w-full pl-8 pr-3 py-2 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  {searchQuery && (
                    <ul className="max-h-40 overflow-y-auto border border-neutral-100 dark:border-neutral-800 rounded-md divide-y divide-neutral-50 dark:divide-neutral-900 bg-white dark:bg-[#000000] shadow-sm">
                      {filteredInventory.slice(0,10).map(p => (
                        <li 
                          key={p.id}
                          onClick={() => handleAddPurchaseItem(p)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-[#111111] flex justify-between"
                        >
                          <span className="font-medium text-neutral-900 dark:text-white">{p.brand_name}</span>
                          <span className="text-xs text-neutral-400 font-mono">{p.sku}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 h-full flex flex-col">
                  <h4 className="font-bold text-neutral-900 dark:text-white mb-4">Ítems de la Factura</h4>
                  
                  <div className="flex-1 overflow-y-auto">
                    {newPurchase.items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-sm">
                        <ShoppingCart size={32} className="opacity-20 mb-2" />
                        <p>No hay productos en esta factura.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {newPurchase.items.map((item, index) => (
                          <div key={index} className="bg-white dark:bg-[#0A0A0A] p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 relative">
                            <button onClick={() => handleRemovePurchaseItem(index)} className="absolute top-2 right-2 text-neutral-400 hover:text-red-500"><X size={14}/></button>
                            <p className="font-bold text-sm text-neutral-900 dark:text-white mb-2 pr-6">{item.name}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase">Cantidad</label>
                                <input type="number" min="1" value={item.quantity} onChange={(e) => handleUpdatePurchaseItem(index, 'quantity', Number(e.target.value))} className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase">Costo Un.</label>
                                <input type="number" min="0" value={item.unit_cost} onChange={(e) => handleUpdatePurchaseItem(index, 'unit_cost', Number(e.target.value))} className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase">Lote (FEFO)</label>
                                <input type="text" value={item.batch_number} onChange={(e) => handleUpdatePurchaseItem(index, 'batch_number', e.target.value)} placeholder="Ej. L-123" className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase">Vencimiento</label>
                                <input type="date" value={item.expiration_date} onChange={(e) => handleUpdatePurchaseItem(index, 'expiration_date', e.target.value)} className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                              </div>
                            </div>
                            <div className="mt-2 text-right text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              Subtotal: ${(item.quantity * item.unit_cost).toLocaleString('es-CO')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <div className="text-neutral-500 font-medium text-sm">
                      Total Factura: <span className="text-xl font-black text-neutral-900 dark:text-white ml-2">
                        ${newPurchase.items.reduce((acc, item) => acc + (item.quantity * item.unit_cost), 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <button 
                      onClick={submitPurchase}
                      disabled={processing || newPurchase.items.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2"
                    >
                      {processing ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                      Guardar Factura e Ingresar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
