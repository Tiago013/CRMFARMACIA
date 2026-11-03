// Reporte Z: cierre del día. Resume las ventas de un día calendario (hora de
// Colombia), cómo se pagaron, las devoluciones y el cuadre de cada turno de caja.
import { roundMoney } from '@/lib/pos/pricing';
import { CASH_METHODS } from '@/lib/pos/cash';
import { formatMoney, type ReportDocument } from './table';

export const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo', CASH: 'Efectivo', card: 'Tarjeta', mixed: 'Mixto', fiado: 'Crédito (fiado)',
};

export type ZSale = {
  id: string;
  status: string;                 // COMPLETED | REFUNDED
  payment_method: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  created_at: Date | string;
  items: { quantity: number; total: number; name: string }[];
};

export type ZSession = {
  status: string;
  opened_at: Date | string;
  closed_at: Date | string | null;
  opening_amount: number;
  cash_sales: number | null;
  expected_amount: number | null;
  counted_amount: number | null;
  difference: number | null;
};

const time = (d: Date | string) =>
  new Date(d).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });

export function buildZReport(date: string, sales: ZSale[], sessions: ZSession[]) {
  const completed = sales.filter((s) => s.status === 'COMPLETED');
  const refunded = sales.filter((s) => s.status === 'REFUNDED');
  const sum = (xs: ZSale[], f: (s: ZSale) => number) => roundMoney(xs.reduce((a, s) => a + f(s), 0));

  // Efectivo antiguo ('CASH') y nuevo ('cash') cuentan juntos
  const byMethod = new Map<string, { method: string; count: number; total: number }>();
  for (const s of completed) {
    const method = CASH_METHODS.includes(s.payment_method) ? 'cash' : s.payment_method;
    const m = byMethod.get(method) ?? { method, count: 0, total: 0 };
    m.count += 1;
    m.total = roundMoney(m.total + s.grand_total);
    byMethod.set(method, m);
  }

  const products = new Map<string, { name: string; units: number; total: number }>();
  for (const s of completed) for (const i of s.items) {
    const p = products.get(i.name) ?? { name: i.name, units: 0, total: 0 };
    p.units += i.quantity;
    p.total = roundMoney(p.total + i.total);
    products.set(i.name, p);
  }

  const times = completed.map((s) => new Date(s.created_at).getTime()).sort((a, b) => a - b);
  const total = sum(completed, (s) => s.grand_total);

  return {
    date,
    salesCount: completed.length,
    subtotal: sum(completed, (s) => s.subtotal),
    discounts: sum(completed, (s) => s.discount_total),
    tax: sum(completed, (s) => s.tax_total),
    total,
    averageTicket: completed.length ? roundMoney(total / completed.length) : 0,
    firstSale: times.length ? time(new Date(times[0])) : null,
    lastSale: times.length ? time(new Date(times[times.length - 1])) : null,
    refunds: { count: refunded.length, total: sum(refunded, (s) => s.grand_total) },
    byMethod: [...byMethod.values()]
      .map((m) => ({ ...m, label: PAYMENT_LABELS[m.method] ?? m.method }))
      .sort((a, b) => b.total - a.total || b.count - a.count),
    topProducts: [...products.values()].sort((a, b) => b.units - a.units || b.total - a.total).slice(0, 10),
    sessions: sessions
      .slice()
      .sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime())
      .map((s) => ({
        status: s.status === 'OPEN' ? 'Abierto' : 'Cerrado',
        opened: time(s.opened_at),
        closed: s.closed_at ? time(s.closed_at) : null,
        opening: s.opening_amount,
        cashSales: s.cash_sales,
        expected: s.expected_amount,
        counted: s.counted_amount,
        difference: s.difference,
      })),
  };
}

export type ZReport = ReturnType<typeof buildZReport>;

// 'YYYY-MM-DD' → '3 de noviembre de 2026'
export function longDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Mismo contenido para Excel y PDF
export function zReportDocument(z: ZReport, pharmacy: string): ReportDocument {
  return {
    filename: `reporte_z_${z.date}`,
    title: 'Reporte Z · Cierre del día',
    subtitle: `${pharmacy} · ${longDate(z.date)}`,
    summary: [
      ['Ventas', String(z.salesCount)],
      ['Subtotal', formatMoney(z.subtotal)],
      ['Descuentos', formatMoney(z.discounts)],
      ['IVA', formatMoney(z.tax)],
      ['Total vendido', formatMoney(z.total)],
      ['Ticket promedio', formatMoney(z.averageTicket)],
      ['Devoluciones', `${z.refunds.count} · ${formatMoney(z.refunds.total)}`],
      ['Primera / última venta', z.firstSale ? `${z.firstSale} – ${z.lastSale}` : '—'],
    ],
    tables: [
      {
        title: 'Por medio de pago',
        columns: [
          { key: 'label', header: 'Medio', format: 'text' },
          { key: 'count', header: 'Ventas', format: 'number' },
          { key: 'total', header: 'Total', format: 'money' },
        ],
        rows: z.byMethod,
      },
      {
        title: 'Turnos de caja',
        columns: [
          { key: 'status', header: 'Estado', format: 'text' },
          { key: 'opened', header: 'Apertura', format: 'text' },
          { key: 'closed', header: 'Cierre', format: 'text' },
          { key: 'opening', header: 'Base', format: 'money' },
          { key: 'cashSales', header: 'Ventas efectivo', format: 'money' },
          { key: 'expected', header: 'Esperado', format: 'money' },
          { key: 'counted', header: 'Contado', format: 'money' },
          { key: 'difference', header: 'Diferencia', format: 'money' },
        ],
        rows: z.sessions,
      },
      {
        title: 'Productos más vendidos',
        columns: [
          { key: 'name', header: 'Producto', format: 'text' },
          { key: 'units', header: 'Unidades', format: 'number' },
          { key: 'total', header: 'Total', format: 'money' },
        ],
        rows: z.topProducts,
      },
    ],
  };
}
