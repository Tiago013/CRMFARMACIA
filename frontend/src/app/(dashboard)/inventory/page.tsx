'use client';

import { useState } from 'react';
import { Package, Search, Filter, Plus, AlertTriangle, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Aspirina 100mg', sku: 'ASP-100', stock: 150, expiring: 0, price: 5.50, critical: false },
  { id: 2, name: 'Vitamina C', sku: 'VIT-C-01', stock: 45, expiring: 12, price: 12.00, critical: false },
  { id: 3, name: 'Losartán 50mg', sku: 'LOS-50', stock: 8, expiring: 0, price: 18.50, critical: true },
  { id: 4, name: 'Amoxicilina 500mg', sku: 'AMX-500', stock: 200, expiring: 50, price: 8.75, critical: false },
];

export default function InventoryPage() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', stock: 0, price: 0 });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) return;
    
    setProducts([{
      ...newProduct,
      id: Date.now(),
      expiring: 0,
      critical: newProduct.stock < 10
    }, ...products]);
    
    setShowProductModal(false);
    setNewProduct({ name: '', sku: '', stock: 0, price: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000000]">
      {/* Header Premium (Linear Style) */}
      <div className="flex justify-between items-center px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            Inventario Central
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">Control de stock, alertas y gestión de lotes FEFO.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto o SKU..." 
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm focus:border-neutral-400 dark:focus:border-neutral-500 outline-none transition-colors placeholder:text-neutral-400"
            />
          </div>
          <button className="p-1.5 border border-neutral-200 dark:border-neutral-800 rounded-md text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
            <Filter size={16} />
          </button>
          <button 
            onClick={() => setShowProductModal(true)}
            className="flex items-center space-x-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="flex-1 overflow-auto bg-[#FDFDFD] dark:bg-[#050505]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000] sticky top-0 z-10">
              <th className="px-8 py-3 text-xs font-medium text-neutral-500">Producto</th>
              <th className="px-8 py-3 text-xs font-medium text-neutral-500">SKU</th>
              <th className="px-8 py-3 text-xs font-medium text-neutral-500">Stock Total</th>
              <th className="px-8 py-3 text-xs font-medium text-neutral-500">Vencimientos</th>
              <th className="px-8 py-3 text-xs font-medium text-neutral-500 text-right">Precio Venta</th>
              <th className="px-8 py-3 text-xs font-medium text-neutral-500 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group">
                <td className="px-8 py-4">
                  <div className="flex items-center">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{product.name}</span>
                    {product.critical && (
                      <span className="ml-2 flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                        CRÍTICO
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-4 text-neutral-500 font-mono text-xs">
                  {product.sku}
                </td>
                <td className="px-8 py-4">
                  <span className={`font-medium ${product.critical ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-8 py-4 text-neutral-500">
                  {product.expiring > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {product.expiring} unids.
                    </span>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  )}
                </td>
                <td className="px-8 py-4 font-medium text-neutral-900 dark:text-white text-right">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"><Edit2 size={14} /></button>
                    <button className="text-neutral-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-12 text-center text-sm text-neutral-500">
                  No se encontraron productos en el inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Nuevo Producto */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Registrar Producto</h3>
              <button onClick={() => setShowProductModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
            </div>
            <form onSubmit={handleAddProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Nombre del Producto</label>
                <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-neutral-500 outline-none" placeholder="Paracetamol 500mg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Código SKU</label>
                <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-neutral-500 outline-none" placeholder="PAR-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Stock Inicial</label>
                  <input required type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})} className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-neutral-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Precio ($)</label>
                  <input required type="number" step="0.01" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})} className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-neutral-500 outline-none" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowProductModal(false)} className="px-3 py-1.5 rounded-md text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-md text-xs font-medium shadow-sm">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
