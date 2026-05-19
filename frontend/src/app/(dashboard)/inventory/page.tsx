'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Filter, Plus, AlertTriangle, MoreVertical, Edit2, Trash2, ShoppingCart, Activity, RefreshCw, FileText, Check, X } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', stock: 0, price: 0 });

  // Mock data for new tabs
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
        
        // Generate mock suggested orders based on products
        const orders = data.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.brand_name,
          currentStock: p.total_stock,
          weeklyDemand: Math.floor(Math.random() * 20) + 5,
          suggestedQty: Math.max(0, (Math.floor(Math.random() * 20) + 15) - p.total_stock),
          supplier: 'Laboratorios MK'
        })).filter((o: any) => o.suggestedQty > 0);
        setSuggestedOrders(orders);

        // Generate mock stock take
        const take = data.slice(0, 8).map((p: any) => ({
          id: p.id,
          name: p.brand_name,
          sku: p.sku,
          systemStock: p.total_stock,
          physicalStock: p.total_stock - Math.floor(Math.random() * 3),
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
            onClick={() => setShowProductModal(true)}
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
                const isExpiring = Math.random() > 0.8; // mock expiring logic
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
                      ${product.unit_price?.toLocaleString('es-CO')}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-neutral-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                        <button className="text-neutral-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {activeTab === 'orders' && (
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
                  {suggestedOrders.map(order => (
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
                        <button className="text-xs font-semibold border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-1.5 hover:bg-white dark:hover:bg-neutral-800 transition-colors shadow-sm">Crear Orden</button>
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
                    <th className="px-6 py-3 font-semibold text-neutral-500">SKU</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Stock Sistema</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Stock Físico (Contado)</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Diferencia</th>
                    <th className="px-6 py-3 font-semibold text-neutral-500 text-right">Ajuste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {stockTake.map(item => {
                    const diff = item.physicalStock - item.systemStock;
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                        <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-white">{item.name}</td>
                        <td className="px-6 py-4 text-neutral-500 font-mono text-xs">{item.sku}</td>
                        <td className="px-6 py-4 text-center font-medium text-neutral-700 dark:text-neutral-300">{item.systemStock}</td>
                        <td className="px-6 py-4 text-center">
                          <input type="number" defaultValue={item.physicalStock} className="w-16 text-center border border-neutral-300 dark:border-neutral-700 rounded-md py-1 bg-white dark:bg-[#111111] font-bold outline-none focus:border-indigo-500" />
                        </td>
                        <td className="px-6 py-4 text-center">
                          {diff === 0 ? (
                            <span className="text-emerald-500 font-bold"><Check size={14} className="inline mr-1" /> Exacto</span>
                          ) : (
                            <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md">{diff}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button disabled={diff === 0} className="text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-black disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 rounded-md px-3 py-1.5 shadow-sm transition-colors">
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
    </div>
  );
}
