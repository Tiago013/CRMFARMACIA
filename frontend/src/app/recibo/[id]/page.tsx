'use client';

import { use, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';

type Receipt = {
  sale: {
    number: string; created_at: string; status: string; payment_method: string;
    subtotal: number; discount_total: number; tax_total: number; grand_total: number;
    items: { name: string; sku: string; quantity: number; unit_price: number; total: number }[];
    patient: { name: string; document_id: string | null } | null;
    cashier: string | null;
  };
  pharmacy: {
    name: string; legal_name: string; tax_id: string | null; address: string | null; phone: string | null;
    dian_resolution: string | null; logo_url: string | null; show_tax: boolean;
  };
};

const money = (v: number) => `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const METHODS: Record<string, string> = { cash: 'Efectivo', CASH: 'Efectivo', card: 'Tarjeta', mixed: 'Mixto', fiado: 'Crédito (fiado)' };

// Recibo en formato tirilla (80 mm). "Descargar PDF" usa el diálogo de impresión
// del navegador, que permite guardar como PDF sin librerías extra.
export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Receipt | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/pos/receipt/${id}`)
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'No se pudo cargar el recibo');
        setData(body);
        document.title = `Recibo ${body.sale.number}`;
      })
      .catch(e => setError(e.message));
  }, [id]);

  if (error) return <p className="p-8 text-center text-red-600">{error}</p>;
  if (!data) return <p className="p-8 text-center text-neutral-500">Cargando recibo…</p>;

  const { sale, pharmacy } = data;
  const date = new Date(sale.created_at);

  return (
    <div className="min-h-screen bg-neutral-100 py-8 print:bg-white print:py-0">
      <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } }`}</style>

      <div className="mx-auto mb-4 flex w-[80mm] justify-end print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
          <Printer size={14} /> Imprimir / Descargar PDF
        </button>
      </div>

      <article className="mx-auto w-[80mm] bg-white p-4 font-mono text-[11px] leading-snug text-black shadow print:shadow-none">
        <header className="text-center">
          {pharmacy.logo_url && <img src={pharmacy.logo_url} alt="" className="mx-auto mb-2 max-h-16 object-contain" />}
          <p className="text-sm font-bold">{pharmacy.name}</p>
          {pharmacy.legal_name !== pharmacy.name && <p>{pharmacy.legal_name}</p>}
          {pharmacy.tax_id && <p>NIT {pharmacy.tax_id}</p>}
          {pharmacy.address && <p>{pharmacy.address}</p>}
          {pharmacy.phone && <p>Tel. {pharmacy.phone}</p>}
        </header>

        <hr className="my-2 border-dashed border-black" />
        <p>Recibo N.º {sale.number}{sale.status === 'REFUNDED' && ' — REEMBOLSADO'}</p>
        <p>{date.toLocaleDateString('es-CO')} {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
        {sale.cashier && <p>Cajero: {sale.cashier}</p>}
        {sale.patient && <p>Cliente: {sale.patient.name}{sale.patient.document_id && ` · CC ${sale.patient.document_id}`}</p>}
        <hr className="my-2 border-dashed border-black" />

        <table className="w-full">
          <tbody>
            {sale.items.map((item, i) => (
              <tr key={i} className="align-top">
                <td className="pb-1">
                  {item.name}
                  <br />
                  <span className="text-neutral-600">{item.quantity} × {money(item.unit_price)}</span>
                </td>
                <td className="pb-1 text-right">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="my-2 border-dashed border-black" />
        <dl className="space-y-0.5">
          {sale.discount_total > 0 && <Row label="Descuentos" value={`-${money(sale.discount_total)}`} />}
          <Row label="Subtotal" value={money(sale.subtotal)} />
          {pharmacy.show_tax && <Row label="IVA 19 %" value={money(sale.tax_total)} />}
          <Row label="TOTAL" value={money(sale.grand_total)} bold />
          <Row label="Pago" value={METHODS[sale.payment_method] ?? sale.payment_method} />
        </dl>

        <hr className="my-2 border-dashed border-black" />
        <footer className="text-center">
          {pharmacy.dian_resolution && <p>{pharmacy.dian_resolution}</p>}
          <p>Documento de demostración · no válido como factura electrónica</p>
          <p className="mt-1">¡Gracias por su compra!</p>
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-sm font-bold' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
