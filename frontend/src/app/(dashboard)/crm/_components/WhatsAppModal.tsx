import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient as api } from '@/lib/axios';
import { fillTemplate, needsSale, type WhatsAppMode } from '@/lib/whatsapp/messages';
import { DemoModeBadge } from '@/components/whatsapp/DemoModeBadge';
import { formatCOP } from './widgets';

const selectClass = 'w-full px-3 py-2 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500';
const labelClass = 'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5';

type Template = { id: string; name: string; content: string };
type PatientSale = { id: string; grand_total: number; created_at: string; items?: { quantity: number; total: number; product?: { brand_name: string } }[] };

// El servidor arma el mensaje con los datos de la base y lo envía (modo local)
// o lo deja en la bandeja simulada (modo demo). Aquí solo se previsualiza.
export function WhatsAppModal({ patient, onClose }: { patient: any; onClose: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sales, setSales] = useState<PatientSale[]>([]);
  const [mode, setMode] = useState<WhatsAppMode | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [saleId, setSaleId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ status: string; error?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/whatsapp/templates').catch(() => ({ data: [] })),
      api.get(`/crm/patients/${patient.id}/sales`).catch(() => ({ data: [] })),
      api.get('/whatsapp/messages').catch(() => ({ data: { mode: 'demo' } })),
    ]).then(([tempRes, salesRes, modeRes]) => {
      setTemplates(tempRes.data || []);
      setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
      setMode(modeRes.data?.mode ?? 'demo');
    });
  }, [patient.id]);

  const template = templates.find((t) => t.id === templateId);
  const wantsSale = template ? needsSale(template.content) : false;
  const sale = wantsSale ? sales.find((s) => s.id === saleId) : undefined;
  const firstName = patient.first_name || String(patient.name ?? '').split(' ')[0];

  const preview = useMemo(() => {
    if (!template) return '';
    return fillTemplate(template.content, firstName, sale && {
      grand_total: Number(sale.grand_total),
      created_at: sale.created_at,
      items: (sale.items ?? []).map((i) => ({ quantity: i.quantity, total: Number(i.total), name: i.product?.brand_name ?? 'Producto' })),
    });
  }, [template, sale, firstName]);

  const send = async () => {
    setError('');
    setIsSending(true);
    try {
      const res = await api.post('/whatsapp/messages', { patient_id: patient.id, template_id: templateId, sale_id: sale?.id ?? null });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo enviar el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl w-[520px] max-w-full shadow-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-bold text-neutral-900 dark:text-white">WhatsApp a {patient.name}</h3>
          {mode === 'demo' && <DemoModeBadge />}
        </div>

        {result ? (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 text-sm ${result.status === 'error' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
              {result.status === 'simulado' && <>Mensaje guardado en la <strong>bandeja de demostración</strong>. En una farmacia real saldría al {patient.phone} por WhatsApp.</>}
              {result.status === 'enviado' && <>Mensaje enviado por WhatsApp al {patient.phone}.</>}
              {result.status === 'error' && <>No se pudo enviar: {result.error}. Quedó registrado en el historial del paciente.</>}
            </div>
            <div className="flex justify-end gap-3">
              <Link href="/whatsapp" className="px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">Ver bandeja</Link>
              <button onClick={onClose} className="px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-md text-sm font-semibold">Listo</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className={labelClass}>Plantilla</label>
              <select className={selectClass} onChange={(e) => setTemplateId(e.target.value)} value={templateId}>
                <option value="" disabled>Seleccione una plantilla...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {wantsSale && (
              <div className="mb-4">
                <label className={labelClass}>Venta a incluir</label>
                <select className={selectClass} value={saleId} onChange={(e) => setSaleId(e.target.value)}>
                  <option value="" disabled>Seleccione una venta del paciente...</option>
                  {sales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {String(s.created_at).split('T')[0]} - ${formatCOP(Number(s.grand_total))}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {template && (
              <div className="mb-4">
                <label className={labelClass}>Vista previa · {patient.phone || 'sin teléfono'}</label>
                <div className="rounded-lg bg-[#E5DDD5] dark:bg-[#0B141A] p-3">
                  <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#DCF8C6] dark:bg-[#005C4B] px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap shadow-sm">
                    {preview}
                  </div>
                </div>
              </div>
            )}

            {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:text-neutral-900 transition-colors">Cancelar</button>
              <button
                onClick={send}
                disabled={isSending || !template || !patient.phone || (wantsSale && !sale)}
                className="px-6 py-2 bg-[#25D366] hover:bg-[#20b858] disabled:opacity-50 text-white rounded-md text-sm font-bold shadow-sm transition-colors"
              >
                {isSending ? 'Enviando...' : mode === 'demo' ? 'Simular envío' : 'Enviar por WhatsApp'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
