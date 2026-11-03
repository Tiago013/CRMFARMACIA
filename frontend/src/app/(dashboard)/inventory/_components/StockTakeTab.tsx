import { useState } from 'react';
import { AdminOnly } from '@/components/AdminOnly';
import { Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AdjustmentHistory, postAdjustment, type StockAfterAdjustment } from './AdjustmentHistory';

export type StockTakeItem = { id: string; name: string; sku: string; systemStock: number; physicalStock: number };

// Conteo físico: se compara con el sistema y cada diferencia aprobada queda
// como movimiento COUNT_ADJUST repartido entre lotes
export function StockTakeTab({ items, setItems, onStockChanged }: {
  items: StockTakeItem[];
  setItems: React.Dispatch<React.SetStateAction<StockTakeItem[]>>;
  onStockChanged: (productId: string, after: StockAfterAdjustment) => void;
}) {
  const [historyKey, setHistoryKey] = useState(0);

  const approve = async (item: StockTakeItem) => {
    const diff = item.physicalStock - item.systemStock;
    try {
      const after = await postAdjustment(item.id, diff, 'COUNT');
      toast.success(`Ajuste de ${diff > 0 ? '+' : ''}${diff} registrado`);
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, systemStock: after.total_stock, physicalStock: after.total_stock } : p));
      onStockChanged(item.id, after);
      setHistoryKey(k => k + 1);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-8">
      <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between items-center">
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Check size={16} className="text-emerald-500" /> Auditoría de Conteo Físico
            </h3>
            <p className="text-xs text-neutral-500 mt-1">Escribe lo que contaste en la estantería y aprueba cada diferencia. Queda registrada en el historial.</p>
          </div>
          <button
            onClick={() => setItems(prev => prev.map(p => ({ ...p, physicalStock: p.systemStock })))}
            className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
          >
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
            {items.map(item => {
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
                      min="0"
                      aria-label={`Conteo físico de ${item.name}`}
                      className="w-20 text-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-black px-2 py-1 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={item.physicalStock}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setItems(prev => prev.map(p => p.id === item.id ? { ...p, physicalStock: isNaN(val) || val < 0 ? 0 : val } : p));
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold ${diff === 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                      {diff > 0 ? '+' : ''}{diff}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <AdminOnly>
                    <button
                      onClick={() => approve(item)}
                      className="text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-black rounded-md px-3 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-50"
                      disabled={diff === 0}
                    >
                      Aprobar Ajuste
                    </button>
                    </AdminOnly>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AdjustmentHistory refreshKey={historyKey} />
    </div>
  );
}
