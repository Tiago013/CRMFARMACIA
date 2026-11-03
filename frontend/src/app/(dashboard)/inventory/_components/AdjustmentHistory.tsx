import { useEffect, useState } from 'react';
import { History } from 'lucide-react';

type Movement = { id: string; date: string; product: string; sku: string; batch: string | null; quantity: number; label: string };

// Últimos ajustes y mermas: cada uno quedó como movimiento de stock
export function AdjustmentHistory({ refreshKey }: { refreshKey: number }) {
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    fetch('/api/inventory/adjustments')
      .then(res => res.json())
      .then(data => setMovements(Array.isArray(data) ? data : []))
      .catch(() => setMovements([]));
  }, [refreshKey]);

  return (
    <div className="mt-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111]">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
          <History size={15} className="text-indigo-500" /> Historial de ajustes y mermas
        </h3>
      </div>
      {movements.length === 0 ? (
        <p className="p-6 text-center text-sm text-neutral-500">Todavía no hay ajustes registrados.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
              <th className="px-6 py-2 font-semibold">Fecha</th>
              <th className="px-6 py-2 font-semibold">Producto</th>
              <th className="px-6 py-2 font-semibold">Lote</th>
              <th className="px-6 py-2 font-semibold">Motivo</th>
              <th className="px-6 py-2 font-semibold text-right">Unidades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {movements.map(m => (
              <tr key={m.id}>
                <td className="px-6 py-2 text-neutral-500">{new Date(m.date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td className="px-6 py-2 font-medium text-neutral-900 dark:text-white">{m.product}</td>
                <td className="px-6 py-2 text-neutral-500">{m.batch ?? '—'}</td>
                <td className="px-6 py-2">{m.label}</td>
                <td className={`px-6 py-2 text-right font-bold ${m.quantity < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Envía un ajuste y devuelve el stock resultante (o lanza el error del servidor)
export type StockAfterAdjustment = { total_stock: number; expiration_date: string };

export async function postAdjustment(product_id: string, difference: number, reason: string): Promise<StockAfterAdjustment> {
  const res = await fetch('/api/inventory/adjustments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id, difference, reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo registrar el ajuste');
  return { total_stock: data.total_stock, expiration_date: data.expiration_date ?? '' };
}
