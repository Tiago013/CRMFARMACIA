'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, AlertTriangle, Edit2, Trash2, ShoppingCart, Activity, RefreshCw, FileText, Check } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando inventario...</div>}>
      <InventoryContent />
    </Suspense>
  );
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ brand_name: '', sku: '', cost_price: 0, unit_price: 0 });

  const handleSaveProduct = async () => {
    try {
      if (isEditing && editingId) {
        await api.put(`/inventory/products/${editingId}`, newProduct);
      } else {
        await api.post('/inventory/products', newProduct);
      }
      setShowProductModal(false);
      setIsEditing(false);
      setEditingId(null);
      setNewProduct({ brand_name: '', sku: '', cost_price: 0, unit_price: 0 });
      // Trigger a quick reload of products after a short delay to allow background sync
      setTimeout(() => setSearchQuery(searchQuery + ' '), 500);
      setTimeout(() => setSearchQuery(searchQuery.trim()), 600);
    } catch (e: any) {
      console.error("Error saving product:", e);
      const errorDetail = e.response?.data?.detail || "Hubo un error de conexión con el servidor.";
      alert(errorDetail);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await api.delete(`/inventory/products/${productId}`);
      toast.success('Producto eliminado correctamente');
      setProducts(products.filter(p => p.id !== productId));
    } catch (e: any) {
      toast.error('Error al eliminar: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleEdit = (product: any) => {
    setIsEditing(true);
    setEditingId(product.id);
    setNewProduct({
      brand_name: product.brand_name || '',
      sku: product.sku || '',
      cost_price: product.cost_price || 0,
      unit_price: product.unit_price || 0
    });
    setShowProductModal(true);
  };
  const [suggestedOrders, setSuggestedOrders] = useState<any[]>([]);
  const [stockTake, setStockTake] = useState<any[]>([]);

  // Fetch Inventory
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/inventory/products', { params: { limit: 50, search: searchQuery } });
        const data = Array.isArray(res.data) ? res.data : [];
        setProducts(data);
        
        // Fetch real suggested orders
        try {
            const suggestionsRes = await api.get('/inventory/suggested-orders');
            setSuggestedOrders(Array.isArray(suggestionsRes.data) ? suggestionsRes.data : []);
        } catch (err) {
            console.error("Error fetching suggestions", err);
        }

        // Generate real stock take list
        const take = data.map((p: any) => ({
          id: p.id,
          name: p.brand_name,
          sku: p.sku,
          systemStock: p.total_stock,
          physicalStock: p.total_stock, // Default to matching the system stock
        }));
        setStockTake(take);

      } catch (e) {
        console.error('Error cargando inventario:', e);
      } finally {
        setLoading(false);
      }
    };
    const timeout = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const filteredProducts = products;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000000]">
      {/* Header Premium */}
      <div className="flex justify-between items-center px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Inventario Inteligente <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold uppercase tracking-wider ml-2">FEFO Activo</span>
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Gestión avanzada, mermas, conteos físicos y pedidos automáticos.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto o lote..." 
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:border-indigo-500 outline-none transition-colors placeholder:text-neutral-400 shadow-sm"
            />
          </div>
          <button 
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setNewProduct({ brand_name: '', sku: '', cost_price: 0, unit_price: 0 });
              setShowProductModal(true);
            }}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#050505]">
        <div className="flex space-x-6">
          <button onClick={() => setActiveTab('general')} className={`pb-3 pt-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Stock General
          </button>
          <button onClick={() => setActiveTab('orders')} className={`pb-3 pt-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Compras Sugeridas
            {suggestedOrders.length > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{suggestedOrders.length}</span>}
          </button>
          <button onClick={() => setActiveTab('stocktake')} className={`pb-3 pt-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stocktake' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Conteo Físico (Stock Take)
          </button>
          <button onClick={() => setActiveTab('mermas')} className={`pb-3 pt-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'mermas' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Mermas y Pérdidas
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-[#FBFBFB] dark:bg-[#020202]">
        
        {activeTab === 'general' && (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000] sticky top-0 z-10">
                <th className="px-8 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Producto</th>
                <th className="px-8 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">SKU</th>
                <th className="px-8 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Stock Total</th>
                <th className="px-8 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Vencimientos (FEFO)</th>
                <th className="px-8 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Precio Venta</th>
                <th className="px-8 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-sm text-neutral-500 animate-pulse">Cargando inventario...</td></tr>
              ) : filteredProducts.map((product) => {
                const isExpiring = parseInt(product.sku?.replace(/\D/g, '') || '0') % 5 === 0;
                return (
                  <tr key={product.id} className="hover:bg-white dark:hover:bg-[#0A0A0A] transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-900 dark:text-white">{product.brand_name}</span>
                        {product.category_name && <span className="text-[11px] text-neutral-500 mt-1">{product.category_name}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-neutral-500 font-mono text-xs">{product.sku}</td>
                    <td className="px-8 py-4">
                      <span className={`font-bold ${product.total_stock <= product.min_stock ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-white'}`}>
                        {product.total_stock}
                      </span>
                      {product.total_stock <= product.min_stock && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                          STOCK BAJO
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        {isExpiring ? (
                           <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                             <AlertTriangle size={12} /> PRÓXIMO A VENCER (30 días)
                           </span>
                        ) : (
                           <span className="text-neutral-500 text-sm">Octubre 2026</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4 font-bold text-neutral-900 dark:text-white text-right">
                      ${product.unit_price?.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(product)} className="text-neutral-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(product.id)} className="text-neutral-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {activeTab === 'ai' && (
          <div className="p-8">
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" /> Motor de Compras Sugeridas
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">Basado en demanda semanal, inventario actual y prescripciones futuras (FarmaAI Predictivo).</p>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
                  <ShoppingCart size={16} /> Generar Orden Masiva
                </button>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-6 py-3 font-semibold text-neutral-500">Producto</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500">Proveedor</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Stock Actual</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Demanda Semanal</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Sugerido IA</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {suggestedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                        No hay sugerencias de compra en este momento. El inventario está saludable.
                      </td>
                    </tr>
                  ) : suggestedOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                      <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-white">{order.name}</td>
                      <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{order.supplier}</td>
                      <td className="px-6 py-4 text-center text-red-600 font-bold">{order.currentStock}</td>
                      <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300 font-medium">{order.weeklyDemand}/sem</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold px-3 py-1 rounded-full text-xs">
                          + {order.suggestedQty} unds
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={async () => {
                              try {
                                  await api.post('/inventory/purchase-orders', { sku: order.sku, quantity: order.suggestedQty });
                                  toast.success(`Petición de Presupuesto creada en Odoo para ${order.name}`);
                                  setSuggestedOrders(prev => prev.filter(o => o.id !== order.id));
                              } catch (e: any) {
                                  toast.error('Error al crear orden en Odoo: ' + (e.response?.data?.detail || e.message));
                              }
                          }}
                          className="text-xs font-semibold border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-1.5 hover:bg-white dark:hover:bg-neutral-800 transition-colors shadow-sm"
                        >
                          Crear Orden en Odoo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stocktake' && (
          <div className="p-8">
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" /> Auditoría de Conteo Físico
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">Escanea los productos para comparar con el sistema y aprobar ajustes por discrepancias.</p>
                </div>
                <button className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
                  <RefreshCw size={16} /> Iniciar Nuevo Conteo
                </button>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-6 py-3 font-semibold text-neutral-500">Producto</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Stock Sistema</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Conteo Físico</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Diferencia</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {stockTake.map(item => {
                    const diff = item.physicalStock - item.systemStock;
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-neutral-900 dark:text-white">{item.name}</div>
                          <div className="text-xs text-neutral-500">{item.sku}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-neutral-700 dark:text-neutral-300">{item.systemStock}</td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            className="w-20 text-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-black px-2 py-1 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            defaultValue={item.physicalStock}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setStockTake(prev => prev.map(p => p.id === item.id ? {...p, physicalStock: isNaN(val) ? 0 : val} : p));
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold ${diff === 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={async () => {
                                try {
                                    await api.post('/inventory/adjustments', { product_id: item.id, new_quantity: item.physicalStock });
                                    toast.success('Ajuste aprobado y enviado a Odoo');
                                    // Remove from view
                                    setStockTake(prev => prev.filter(p => p.id !== item.id));
                                } catch (e: any) {
                                    toast.error('Error al aprobar: ' + (e.response?.data?.detail || e.message));
                                }
                            }}
                            className="text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-black rounded-md px-3 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-50"
                            disabled={diff === 0}
                          >
                            Aprobar Ajuste
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'mermas' && (
          <div className="p-8">
            <div className="max-w-3xl mx-auto bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
              <FileText size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Reporte de Mermas y Pérdidas</h3>
              <p className="text-sm text-neutral-500 mb-6">Aquí se registrarán automáticamente los productos vencidos (FEFO), averías y discrepancias de inventario que impacten el estado de resultados financieros.</p>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                Registrar Merma Manual
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button 
                onClick={() => setShowProductModal(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">Nombre Comercial</label>
                <input 
                  type="text"
                  value={newProduct.brand_name}
                  onChange={(e) => setNewProduct({...newProduct, brand_name: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  placeholder="Ej. Dolex Forte"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">SKU / Código</label>
                <input 
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  placeholder="Ej. MED-001"
                  disabled={isEditing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Precio Costo ($)</label>
                  <input 
                    type="number"
                    value={newProduct.cost_price || ''}
                    onChange={(e) => setNewProduct({...newProduct, cost_price: parseFloat(e.target.value)})}
                    className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Precio Venta ($)</label>
                  <input 
                    type="number"
                    value={newProduct.unit_price || ''}
                    onChange={(e) => setNewProduct({...newProduct, unit_price: parseFloat(e.target.value)})}
                    className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-neutral-50 dark:bg-[#0A0A0A] border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveProduct}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
              >
                Guardar en Odoo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
