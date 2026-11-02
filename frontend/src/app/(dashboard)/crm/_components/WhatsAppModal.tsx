import { useEffect, useState } from 'react';
import { apiClient as api } from '@/lib/axios';
import { formatCOP } from './widgets';

const selectClass = 'w-full px-3 py-2 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500';
const labelClass = 'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5';

// Rellena {{1}}..{{4}} de la plantilla con el paciente y, si aplica, una venta
function buildMessage(template: any, patient: any, sale: any | undefined) {
  let msg: string = template.content.replace('{{1}}', patient.first_name || patient.name);
  if (sale) {
    msg = msg.replace('{{2}}', `$${formatCOP(Number(sale.grand_total))}`);
    msg = msg.replace('{{3}}', new Date(sale.created_at).toLocaleDateString('es-CO'));
    const itemsDetail = sale.items?.map((item: any) =>
      `🔹 ${item.quantity}x ${item.product?.brand_name || 'Producto'} ($${Number(item.total).toLocaleString('es-CO')})`
    ).join('\n') || 'Productos no detallados';
    return msg.replace('{{4}}', itemsDetail);
  }
  return msg.replace('{{2}}', '(Monto)').replace('{{3}}', '(Fecha)').replace('{{4}}', '(Detalle de compra)');
}

// Envío por el servicio local de WhatsApp (scripts/whatsapp-server.ts)
export function WhatsAppModal({ patient, onClose }: { patient: any; onClose: () => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/whatsapp/templates').catch(() => ({ data: [] })),
      api.get(`/crm/patients/${patient.id}/sales`).catch(() => ({ data: [] })),
    ]).then(([tempRes, recRes]) => {
      setTemplates(tempRes.data || []);
      setSales(Array.isArray(recRes.data) ? recRes.data : []);
    });
  }, [patient.id]);

  const isPosTemplate = selectedTemplate?.name?.includes('POS');

  const send = async () => {
    if (!patient.phone) {
      alert("El paciente no tiene número de teléfono registrado.");
      return;
    }
    setIsSending(true);
    try {
      const sale = isPosTemplate && selectedSaleId ? sales.find((s: any) => s.id === selectedSaleId) : undefined;
      const res = await fetch('http://localhost:3001/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: patient.phone, message: buildMessage(selectedTemplate, patient, sale) })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${res.status}`);
      }

      onClose();
      alert("Mensaje enviado por WhatsApp de forma local.");
    } catch (e: any) {
      alert("Fallo al enviar: " + (e.message || "Asegúrate de que el microservicio está corriendo."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl w-[500px] shadow-2xl border border-neutral-200 dark:border-neutral-800">
        <h3 className="font-bold mb-4 text-neutral-900 dark:text-white">Mensaje WhatsApp a {patient.name}</h3>

        <div className="mb-4">
          <label className={labelClass}>Seleccionar Plantilla</label>
          <select
            className={selectClass}
            onChange={(e) => setSelectedTemplate(templates.find((x: any) => x.id === e.target.value))}
            value={selectedTemplate?.id || ''}
          >
            <option value="" disabled>Seleccione una plantilla...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {selectedTemplate && (
          <div className="mb-4">
            <label className={labelClass}>Contenido de la plantilla</label>
            <div className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {selectedTemplate.content}
            </div>
          </div>
        )}

        {isPosTemplate && (
          <div className="mb-4">
            <label className={labelClass}>Vincular Venta (Para inyectar el total pagado)</label>
            <select className={selectClass} value={selectedSaleId} onChange={(e) => setSelectedSaleId(e.target.value)}>
              <option value="" disabled>Seleccione una venta del paciente...</option>
              {sales.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {String(s.created_at).split('T')[0]} - ${formatCOP(Number(s.grand_total))}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:text-neutral-900 transition-colors">Cancelar</button>
          <button
            onClick={send}
            disabled={isSending || !selectedTemplate}
            className="px-6 py-2 bg-[#25D366] hover:bg-[#20b858] disabled:opacity-50 text-white rounded-md text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            {isSending ? 'Enviando...' : 'Enviar por WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
