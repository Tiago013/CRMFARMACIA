import { useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { expiryStatus } from '@/lib/inventory/fefo';
import { AdjustmentHistory, postAdjustment } from './AdjustmentHistory';

const REASONS = [
  { id: 'EXPIRED', label: 'Vencido' },
  { id: 'DAMAGED', label: 'Averiado' },
  { id: 'LOST', label: 'Pérdida o robo' },
];

// Mermas: bajas con motivo. Los vencidos salen solo de lotes vencidos; el resto,
// del lote que vence primero. Cada baja queda como movimiento WASTE_*.
export function WasteTab({ products, onStockChanged }: {
  products: any[];
  onStockChanged: (productId: string, totalStock: number) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [historyKey, setHistoryKey] = useState(0);

  const writeOff = async (item: any) => {
    const qty = quantities[item.id] || 0;
    if (qty <= 0 || qty > item.total_stock) return toast.error('Cantidad inválida para dar de baja');
    const reason = reasons[item.id] ?? (expiryStatus(item.expiration_date) === 'expired' ? 'EXPIRED' : 'DAMAGED');
    try {
      const totalStock = await postAdjustment(item.id, -qty, reason);
      toast.success(`Se registraron ${qty} unidades como merma`);
      setQuantities(prev => ({ ...prev, [item.id]: 0 }));
      onStockChanged(item.id, totalStock);
      setHistoryKey(k => k + 1);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-8">
      <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111]">
          <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <FileText size={16} className="text-red-500" /> Registro de Mermas (Bajas)
          </h3>
          <p className="text-xs text-neutral-500 mt-1">Busca el producto arriba, elige el motivo y la cantidad. El stock se descuenta del lote correspondiente y queda en el historial.</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="px-6 py-3 font-semibold text-neutral-500">Producto</th>
              <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Stock Actual</th>
              <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Motivo</th>
              <th className="px-6 py-3 font-semibold text-neutral-500 text-center">Cant. a dar de Baja</th>
              <th className="px-6 py-3 font-semibold text-neutral-500 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {products.map(item => {
              const expired = expiryStatus(item.expiration_date) === 'expired';
              return (
                <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-neutral-900 dark:text-white">{item.brand_name}</div>
                    <div className="text-xs text-neutral-500">{item.sku}{expired && <span className="ml-2 font-bold text-red-500">· tiene lote vencido</span>}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-neutral-700 dark:text-neutral-300">{item.total_stock}</td>
                  <td className="px-6 py-4 text-center">
                    <select
                      aria-label={`Motivo de la baja de ${item.brand_name}`}
                      value={reasons[item.id] ?? (expired ? 'EXPIRED' : 'DAMAGED')}
                      onChange={(e) => setReasons(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-black px-2 py-1 text-xs outline-none"
                    >
                      {REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      min="1"
                      max={item.total_stock}
                      placeholder="0"
                      aria-label={`Unidades a dar de baja de ${item.brand_name}`}
                      value={quantities[item.id] || ''}
                      onChange={(e) => setQuantities(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                      className="w-20 text-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-black px-2 py-1 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => writeOff(item)} className="text-xs font-semibold bg-red-600 text-white rounded-md px-3 py-1.5 hover:bg-red-700 transition-colors shadow-sm">
                      Dar de Baja
                    </button>
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
