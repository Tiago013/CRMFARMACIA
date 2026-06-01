"use client";

import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Edit2, Trash2, Phone, Mail, FileText, 
  ShoppingCart, Building2, PackagePlus, Calendar, DollarSign,
  ArrowRight, CheckCircle2, AlertTriangle, X
} from 'lucide-react';
import { apiClient as api } from '@/lib/axios';
import { Spinner } from '@/components/ui/Spinner';

interface Supplier {
  id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
}

interface Product {
  id: string;
  name: string;
  brand_name: string;
  sku: string;
  cost_price: number;
}

interface PurchaseItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  batch_number: string;
  expiration_date: string;
}

interface Purchase {
  id: string;
  created_at: string;
  invoice_number: string | null;
  total_amount: number;
  status: string;
  supplier: Supplier;
  items: any[];
}

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'receive' | 'history'>('directory');
  
  // Data States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '', tax_id: '', email: '', phone: '', address: ''
  });

  // Receiving State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiveItems, setReceiveItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  useEffect(() => {
    // URL parsing for Drafts
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'receive' && activeTab !== 'receive') {
        setActiveTab('receive');
      }
      
      if (params.get('draft') === 'true') {
        const draftStr = localStorage.getItem('purchaseDraft');
        if (draftStr) {
          try {
            const items = JSON.parse(draftStr);
            setReceiveItems(items);
            localStorage.removeItem('purchaseDraft');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch(e) {}
        }
      }
    }
    
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'directory' || activeTab === 'receive') {
        const resSuppliers = await api.get('/suppliers');
        setSuppliers(resSuppliers.data);
      }
      
      if (activeTab === 'receive') {
        const resProducts = await api.get('/inventory/products');
        setProducts(resProducts.data);
      }

      if (activeTab === 'history') {
        const resPurchases = await api.get('/purchases');
        setPurchases(resPurchases.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- SUPPLIER FUNCTIONS ---

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, supplierForm);
      } else {
        await api.post('/suppliers', supplierForm);
      }
      setShowSupplierModal(false);
      fetchData();
    } catch (err) {
      alert("Error guardando proveedor");
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este proveedor?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchData();
    } catch (err) {
      alert("Error eliminando proveedor");
    }
  };

  const openSupplierModal = (sup?: Supplier) => {
    if (sup) {
      setEditingSupplier(sup);
      setSupplierForm({
        name: sup.name,
        tax_id: sup.tax_id || '',
        email: sup.email || '',
        phone: sup.phone || '',
        address: sup.address || ''
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({ name: '', tax_id: '', email: '', phone: '', address: '' });
    }
    setShowSupplierModal(true);
  };

  // --- RECEIVING FUNCTIONS ---

  const handleAddReceiveItem = (product: Product) => {
    setReceiveItems(prev => [
      {
        product_id: product.id,
        product_name: product.brand_name || product.name,
        quantity: 1,
        unit_cost: product.cost_price || 0,
        batch_number: '',
        expiration_date: ''
      },
      ...prev
    ]);
    setProductSearch('');
    setShowProductSearch(false);
  };

  const handleUpdateReceiveItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...receiveItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setReceiveItems(newItems);
  };

  const handleRemoveReceiveItem = (index: number) => {
    setReceiveItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplierId) return alert("Selecciona un proveedor");
    if (receiveItems.length === 0) return alert("Agrega al menos un producto");
    
    // Validar lotes
    for (const item of receiveItems) {
      if (item.quantity <= 0) return alert(`La cantidad para ${item.product_name} debe ser mayor a 0`);
      if (item.unit_cost < 0) return alert(`El costo para ${item.product_name} no puede ser negativo`);
    }

    setSubmittingPurchase(true);
    try {
      const total_amount = receiveItems.reduce((acc, item) => acc + (item.quantity * item.unit_cost), 0);
      
      await api.post('/purchases', {
        supplier_id: selectedSupplierId,
        invoice_number: invoiceNumber,
        total_amount,
        status: 'COMPLETED',
        items: receiveItems
      });

      alert("Ingreso de mercadería registrado con éxito. El inventario ha sido actualizado.");
      setSelectedSupplierId('');
      setInvoiceNumber('');
      setReceiveItems([]);
      setActiveTab('history');
    } catch (err: any) {
      alert("Error registrando compra: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingPurchase(false);
    }
  };


  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.tax_id && s.tax_id.includes(searchQuery))
  );

  const filteredProducts = products.filter(p => 
    p.brand_name?.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 5);

  const receiveTotal = receiveItems.reduce((acc, item) => acc + (item.quantity * item.unit_cost), 0);

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-8 py-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0A0A0A] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
              <Truck className="text-indigo-600 dark:text-indigo-400" size={24} /> 
            </div>
            Proveedores y Compras
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2 font-medium">
            Gestiona tus proveedores e ingresa mercadería al inventario.
          </p>
        </div>
        {activeTab === 'directory' && (
          <button 
            onClick={() => openSupplierModal()}
            className="mt-6 sm:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 relative z-10 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Nuevo Proveedor
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('directory')} 
            className={`pb-4 pt-5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2.5 ${activeTab === 'directory' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
          >
            <Building2 size={18} className={activeTab === 'directory' ? '' : 'opacity-70'} /> Directorio
          </button>
          <button 
            onClick={() => setActiveTab('receive')} 
            className={`pb-4 pt-5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2.5 ${activeTab === 'receive' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
          >
            <PackagePlus size={18} className={activeTab === 'receive' ? '' : 'opacity-70'} /> Ingreso de Mercadería
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`pb-4 pt-5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2.5 ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
          >
            <FileText size={18} className={activeTab === 'history' ? '' : 'opacity-70'} /> Historial de Compras
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        
        {/* TAB 1: DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="relative w-full md:w-[400px]">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-neutral-400" size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Buscar proveedor o NIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Spinner size={32} /></div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-20 text-neutral-500">
                <Truck size={48} className="mx-auto mb-4 opacity-20" />
                <p>No se encontraron proveedores.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(sup => (
                  <div key={sup.id} className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-6 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-indigo-500/0 group-hover:from-indigo-500/5 dark:group-hover:from-indigo-500/10 transition-colors pointer-events-none"></div>
                    
                    <div>
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2 z-10">
                        <button onClick={() => openSupplierModal(sup)} className="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-[#1A1A1A] bg-neutral-50/80 dark:bg-black/80 shadow-sm backdrop-blur-md transition-all"><Edit2 size={16}/></button>
                        <button onClick={() => handleDeleteSupplier(sup.id)} className="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-[#1A1A1A] bg-neutral-50/80 dark:bg-black/80 shadow-sm backdrop-blur-md transition-all"><Trash2 size={16}/></button>
                      </div>
                      
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-500/20 dark:to-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-2xl shadow-inner shrink-0 relative overflow-hidden">
                          <div className="absolute inset-0 bg-white/20 dark:bg-black/20 w-full h-full transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                          {sup.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-tight truncate pr-16 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{sup.name}</h3>
                          {sup.tax_id && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-black tracking-wider text-neutral-400 bg-neutral-100 dark:bg-[#141414] px-1.5 py-0.5 rounded">NIT</span>
                              <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono font-medium truncate">{sup.tax_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-5 border-t border-neutral-100 dark:border-neutral-800/80">
                      {sup.phone && (
                        <div className="flex items-center gap-3 group/item">
                          <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-[#111111] flex items-center justify-center text-neutral-400 group-hover/item:text-indigo-500 transition-colors border border-neutral-200/50 dark:border-neutral-800/50">
                            <Phone size={14} />
                          </div>
                          <span className="text-sm text-neutral-600 dark:text-neutral-300 truncate font-medium">{sup.phone}</span>
                        </div>
                      )}
                      {sup.email && (
                        <div className="flex items-center gap-3 group/item">
                          <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-[#111111] flex items-center justify-center text-neutral-400 group-hover/item:text-indigo-500 transition-colors border border-neutral-200/50 dark:border-neutral-800/50">
                            <Mail size={14} />
                          </div>
                          <span className="text-sm text-neutral-600 dark:text-neutral-300 truncate font-medium">{sup.email}</span>
                        </div>
                      )}
                      {!sup.phone && !sup.email && (
                        <div className="text-xs text-neutral-400 italic py-2">Sin información de contacto</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RECEIVE (INGRESO DE MERCADERÍA) */}
        {activeTab === 'receive' && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Cart & Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Supplier & Invoice Form */}
              <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-500" /> Datos de la Factura
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Proveedor</label>
                    <select 
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                    >
                      <option value="">Selecciona un proveedor...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.tax_id ? `(${s.tax_id})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">No. Factura / Remisión</label>
                    <input 
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej. FAC-10293"
                      className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-0 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between items-center">
                  <h2 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <PackagePlus size={18} className="text-emerald-500" /> Productos Recibidos
                  </h2>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Buscar producto para agregar..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductSearch(true);
                        }}
                        onFocus={() => setShowProductSearch(true)}
                        className="w-64 pl-9 pr-4 py-1.5 bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-indigo-500 outline-none shadow-sm"
                      />
                    </div>
                    
                    {/* Search Dropdown */}
                    {showProductSearch && productSearch && (
                      <div className="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                        {filteredProducts.length === 0 ? (
                          <div className="p-3 text-sm text-neutral-500 text-center">No encontrado</div>
                        ) : (
                          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {filteredProducts.map(p => (
                              <li 
                                key={p.id}
                                onClick={() => handleAddReceiveItem(p)}
                                className="p-3 hover:bg-neutral-50 dark:hover:bg-[#1A1A1A] cursor-pointer flex justify-between items-center"
                              >
                                <div>
                                  <div className="font-bold text-sm text-neutral-900 dark:text-white">{p.brand_name}</div>
                                  <div className="text-xs text-neutral-500">{p.sku}</div>
                                </div>
                                <Plus size={16} className="text-indigo-600" />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  {receiveItems.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                      <ShoppingCart size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Usa el buscador arriba para agregar productos a esta factura.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-white dark:bg-[#0A0A0A] border-b border-neutral-200 dark:border-neutral-800">
                        <tr>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs w-1/3">Producto</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">Cant.</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">Costo Unit.</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">Lote & Venc.</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs text-right">Subtotal</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {receiveItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-[#111111] group">
                            <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white overflow-hidden text-ellipsis max-w-[200px]" title={item.product_name}>
                              {item.product_name}
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number" 
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateReceiveItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-16 bg-white dark:bg-[#1A1A1A] border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={item.unit_cost}
                                  onChange={(e) => handleUpdateReceiveItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                  className="w-24 pl-5 bg-white dark:bg-[#1A1A1A] border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <input 
                                  type="text" 
                                  placeholder="No. Lote (Opcional)"
                                  value={item.batch_number}
                                  onChange={(e) => handleUpdateReceiveItem(idx, 'batch_number', e.target.value)}
                                  className="w-32 bg-white dark:bg-[#1A1A1A] border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 uppercase"
                                />
                                <input 
                                  type="date" 
                                  value={item.expiration_date}
                                  onChange={(e) => handleUpdateReceiveItem(idx, 'expiration_date', e.target.value)}
                                  className="w-32 bg-white dark:bg-[#1A1A1A] border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 text-neutral-500"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-white">
                              ${(item.quantity * item.unit_cost).toLocaleString('es-CO')}
                            </td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => handleRemoveReceiveItem(idx)}
                                className="text-neutral-400 hover:text-red-600 transition-colors opacity-50 group-hover:opacity-100"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Right Col: Summary */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm sticky top-6">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                  Resumen de Ingreso
                </h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Productos distintos</span>
                    <span className="font-bold">{receiveItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Total Unidades</span>
                    <span className="font-bold">{receiveItems.reduce((acc, item) => acc + item.quantity, 0)}</span>
                  </div>
                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-end">
                    <span className="text-neutral-900 dark:text-white font-bold">Total Factura</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      ${receiveTotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 flex gap-3">
                  <AlertTriangle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Al confirmar, el inventario subirá automáticamente, se actualizará el costo de los productos y se registrará un <b>Gasto</b> por ${receiveTotal.toLocaleString('es-CO')} en el reporte de Finanzas.
                  </p>
                </div>

                <button 
                  onClick={handleSavePurchase}
                  disabled={submittingPurchase || receiveItems.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {submittingPurchase ? <Spinner size={20} color="white" /> : <><CheckCircle2 size={18} /> Confirmar Ingreso</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Historial de Compras Recientes</h2>
            {loading ? (
              <div className="flex justify-center py-10"><Spinner size={24} /></div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <p className="text-neutral-500">Aún no hay compras registradas.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-neutral-50 dark:bg-[#111111] border-b border-neutral-200 dark:border-neutral-800">
                    <tr>
                      <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Fecha</th>
                      <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Proveedor</th>
                      <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Factura</th>
                      <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Items</th>
                      <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-wider text-xs text-right">Total Pagado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {purchases.map(p => (
                      <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors cursor-pointer" onClick={() => alert(`Esta compra tiene ${p.items.length} productos. Función de ver detalles en desarrollo.`)}>
                        <td className="px-6 py-4 text-neutral-900 dark:text-neutral-300">
                          {new Date(p.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">
                          {p.supplier?.name || 'Desconocido'}
                        </td>
                        <td className="px-6 py-4 text-neutral-500 font-mono text-xs">
                          {p.invoice_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                          {p.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} unid.
                        </td>
                        <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white text-right">
                          ${p.total_amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
              <h3 className="font-bold text-neutral-900 dark:text-white text-lg">
                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Razón Social *</label>
                <input 
                  type="text" required
                  value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">NIT / RUT</label>
                <input 
                  type="text"
                  value={supplierForm.tax_id} onChange={e => setSupplierForm({...supplierForm, tax_id: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input 
                    type="text"
                    value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Correo</label>
                  <input 
                    type="email"
                    value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Dirección Física</label>
                <input 
                  type="text"
                  value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="flex-1 px-4 py-2 text-sm font-bold border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
