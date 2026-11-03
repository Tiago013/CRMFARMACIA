'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';

type Bucket = { batches: number; units: number; value: number };
type Data = {
  buckets: Record<'expired' | 'd30' | 'd60' | 'd90', Bucket>;
  items: { product_id: string; product: string; batch: string; expiration_date: string; quantity: number; bucket: string }[];
};

const WINDOWS = [
  { key: 'expired', label: 'Vencidos', tone: 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400' },
  { key: 'd30', label: '≤ 30 días', tone: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400' },
  { key: 'd60', label: '31–60 días', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
  { key: 'd90', label: '61–90 días', tone: 'text-neutral-600 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400' },
] as const;

const money = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;

// Panel de vencimientos a 30/60/90 días: qué lotes con stock vencen y cuánto valen a costo
export function ExpiryPanel() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch('/api/inventory/expiring')
      .then(res => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="flex flex-col p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <CalendarClock size={16} className="text-orange-500" /> Vencimientos próximos
        </h3>
        <Link href="/inventory" className="text-xs font-semibold text-indigo-600 hover:underline">Ver inventario</Link>
      </div>

      {!data ? (
        <p className="text-sm text-neutral-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {WINDOWS.map(w => (
              <div key={w.key} className={`rounded-lg p-3 ${w.tone}`}>
                <p className="text-[11px] font-bold uppercase tracking-wide">{w.label}</p>
                <p className="text-lg font-black">{data.buckets[w.key].units.toLocaleString('es-CO')} uds</p>
                <p className="text-[11px] opacity-80">{data.buckets[w.key].batches} lotes · {money(data.buckets[w.key].value)} a costo</p>
              </div>
            ))}
          </div>

          {data.items.length === 0 ? (
            <p className="text-sm text-neutral-500">Ningún lote con stock vence en los próximos 90 días.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
              {data.items.map((item, i) => (
                <li key={i} className="py-2 flex justify-between gap-3">
                  <span className="truncate">
                    <span className="font-medium text-neutral-900 dark:text-white">{item.product}</span>
                    <span className="text-xs text-neutral-500"> · lote {item.batch}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${item.bucket === 'expired' ? 'text-red-500' : item.bucket === 'd30' ? 'text-orange-500' : 'text-neutral-500'}`}>
                    {item.quantity} uds · {new Date(item.expiration_date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
