import type { RefObject } from 'react';
import { HelpCircle, Lock, RefreshCw, Save, Search, Wifi, WifiOff, Zap } from 'lucide-react';
import type { DrawerStatus } from './types';
import { expiryStatus } from '@/lib/inventory/fefo';

const HINTS = ['F2 Buscar', 'F4 Cliente', 'F7 Suspender', 'F8 Cobrar/Recuperar', 'F9 Anular'];

// Columna izquierda: estado de conexión y caja, buscador y catálogo
export function ProductPanel({ products, onAdd, onSubmitSearch, searchQuery, onSearch, searchInputRef, isOffline, isSyncing, offlineCount, drawerStatus, onToggleDrawer, onHelp }: {
  products: any[];
  onAdd: (product: any) => void;
  onSubmitSearch: (query: string) => void; // Enter: código de barras, SKU o primer resultado
  searchQuery: string;
  onSearch: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  isOffline: boolean;
  isSyncing: boolean;
  offlineCount: number;
  drawerStatus: DrawerStatus;
  onToggleDrawer: () => void;
  onHelp: () => void;
}) {
  return (
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

            <button
              onClick={onToggleDrawer}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm border transition-colors ${drawerStatus === 'open' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400'}`}
            >
              <Lock size={14} />
              {drawerStatus === 'open' ? 'Caja Abierta' : drawerStatus === 'loading' ? 'Cargando caja…' : 'Caja Cerrada'} [F10]
            </button>

            <button onClick={onHelp} className="text-neutral-400 hover:text-neutral-600 transition-colors">
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
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmitSearch(searchQuery);
            }}
            placeholder="Escanear código o buscar producto (Enter para rápido) [F2]"
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm focus:border-indigo-500 outline-none transition-colors placeholder:text-neutral-400"
            autoFocus
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {HINTS.map(hint => (
            <span key={hint} className="text-[10px] bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded text-neutral-500 font-medium">{hint}</span>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p: any) => {
            // Estado del lote que se vendería primero (FEFO)
            const expiry = expiryStatus(p.expiration_date);
            const isExpiring = expiry === 'expiring';
            return (
              <button
                key={p.id}
                onClick={() => onAdd(p)}
                className={`flex flex-col items-start p-3 bg-white dark:bg-[#0A0A0A] border rounded-md transition-colors text-left group ${isExpiring ? 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500'}`}
              >
                <div className="flex justify-between w-full mb-1">
                  <span className="text-[10px] font-medium text-neutral-500">{p.sku}</span>
                  <span className={`text-[10px] font-bold ${(p.total_stock || 0) < 5 ? 'text-red-500' : 'text-neutral-500'}`}>
                    Stock: {p.total_stock || 0}
                  </span>
                </div>
                {isExpiring && <span className="text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 py-0.5 rounded font-bold mb-1">PRÓXIMO A VENCER (FEFO)</span>}
                {expiry === 'expired' && <span className="text-[8px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1 py-0.5 rounded font-bold mb-1">HAY UN LOTE VENCIDO</span>}
                <span className="font-medium text-neutral-900 dark:text-neutral-100 text-sm mt-1 truncate w-full">{p.brand_name}</span>
                <span className="mt-2 font-semibold text-neutral-900 dark:text-white text-sm">${(p.unit_price || 0).toLocaleString('es-CO')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
