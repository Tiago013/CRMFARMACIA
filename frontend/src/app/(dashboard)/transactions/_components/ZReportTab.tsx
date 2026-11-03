'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { localDay } from '@/lib/dates';
import { formatMoney } from '@/lib/reports/table';
import { longDate, zReportDocument, type ZReport } from '@/lib/reports/zReport';
import { ExportButtons } from '@/components/reports/ExportButtons';

const card = 'bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm';
const th = 'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500';
const td = 'px-4 py-2 text-sm text-neutral-800 dark:text-neutral-200';
const money = (v: number | null) => (v === null ? '—' : formatMoney(v));

// Cierre del día (reporte Z): lo que se vendió, cómo se pagó y el cuadre de caja
export function ZReportTab() {
  const [date, setDate] = useState(() => localDay(new Date()));
  const [data, setData] = useState<{ pharmacy: string; report: ZReport } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (day: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/z?date=${day}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar el reporte Z');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const z = data?.report;

  return (
    <div className="space-y-6">
      <div className={`${card} p-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <h2 className="font-bold text-neutral-900 dark:text-white">Reporte Z · Cierre del día</h2>
          <p className="text-sm text-neutral-500">{longDate(date)}{data && ` · ${data.pharmacy}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            max={localDay(new Date())}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg"
            aria-label="Día del reporte"
          />
          <ExportButtons disabled={!z} document={() => zReportDocument(z!, data!.pharmacy)} />
        </div>
      </div>

      {loading || !z ? (
        <div className="h-32 flex items-center justify-center"><RefreshCw className="animate-spin text-neutral-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Total vendido', formatMoney(z.total)],
              ['Ventas', String(z.salesCount)],
              ['Ticket promedio', formatMoney(z.averageTicket)],
              ['IVA', formatMoney(z.tax)],
            ].map(([label, value]) => (
              <div key={label} className={`${card} p-4`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-neutral-500">
            Subtotal {formatMoney(z.subtotal)} · descuentos {formatMoney(z.discounts)} ·
            devoluciones {z.refunds.count} ({formatMoney(z.refunds.total)}) ·
            {z.firstSale ? ` primera venta ${z.firstSale}, última ${z.lastSale}` : ' sin ventas este día'}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <section className={card}>
              <h3 className="px-4 pt-4 pb-2 font-semibold text-neutral-900 dark:text-white">Por medio de pago</h3>
              <table className="w-full">
                <thead><tr><th className={th}>Medio</th><th className={`${th} text-right`}>Ventas</th><th className={`${th} text-right`}>Total</th></tr></thead>
                <tbody>
                  {z.byMethod.map((m) => (
                    <tr key={m.method} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className={td}>{m.label}</td><td className={`${td} text-right`}>{m.count}</td><td className={`${td} text-right font-semibold`}>{formatMoney(m.total)}</td>
                    </tr>
                  ))}
                  {z.byMethod.length === 0 && <tr><td colSpan={3} className={`${td} text-neutral-500`}>Sin ventas</td></tr>}
                </tbody>
              </table>
            </section>

            <section className={card}>
              <h3 className="px-4 pt-4 pb-2 font-semibold text-neutral-900 dark:text-white">Productos más vendidos</h3>
              <table className="w-full">
                <thead><tr><th className={th}>Producto</th><th className={`${th} text-right`}>Unid.</th><th className={`${th} text-right`}>Total</th></tr></thead>
                <tbody>
                  {z.topProducts.map((p) => (
                    <tr key={p.name} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className={td}>{p.name}</td><td className={`${td} text-right`}>{p.units}</td><td className={`${td} text-right`}>{formatMoney(p.total)}</td>
                    </tr>
                  ))}
                  {z.topProducts.length === 0 && <tr><td colSpan={3} className={`${td} text-neutral-500`}>Sin ventas</td></tr>}
                </tbody>
              </table>
            </section>
          </div>

          <section className={`${card} overflow-x-auto`}>
            <h3 className="px-4 pt-4 pb-2 font-semibold text-neutral-900 dark:text-white">Turnos de caja</h3>
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  {['Estado', 'Apertura', 'Cierre', 'Base', 'Ventas efectivo', 'Esperado', 'Contado', 'Diferencia'].map((h, i) => (
                    <th key={h} className={`${th} ${i > 2 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {z.sessions.map((s, i) => (
                  <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className={td}>{s.status}</td>
                    <td className={td}>{s.opened}</td>
                    <td className={td}>{s.closed ?? '—'}</td>
                    <td className={`${td} text-right`}>{money(s.opening)}</td>
                    <td className={`${td} text-right`}>{money(s.cashSales)}</td>
                    <td className={`${td} text-right`}>{money(s.expected)}</td>
                    <td className={`${td} text-right`}>{money(s.counted)}</td>
                    <td className={`${td} text-right font-semibold ${s.difference ? (s.difference < 0 ? 'text-rose-600' : 'text-emerald-600') : ''}`}>{money(s.difference)}</td>
                  </tr>
                ))}
                {z.sessions.length === 0 && <tr><td colSpan={8} className={`${td} text-neutral-500`}>No hubo turnos de caja este día</td></tr>}
              </tbody>
            </table>
            {z.sessions.some((s) => s.status === 'Abierto') && (
              <p className="px-4 pb-4 pt-2 text-xs text-neutral-500">El turno abierto muestra lo esperado hasta ahora; el contado y la diferencia aparecen al cerrar caja.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

