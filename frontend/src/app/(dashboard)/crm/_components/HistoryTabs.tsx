import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, MessageCircle, ShoppingCart } from 'lucide-react';
import { formatCOP } from './widgets';

const card = 'bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm';
const thead = 'bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500 text-xs uppercase font-semibold';

export function TimelineTab({ events }: { events: any[] }) {
  return (
    <div className="max-w-3xl">
      <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-px before:bg-neutral-200 dark:before:bg-neutral-800 space-y-8">
        {events.map((ev: any, idx: number) => (
          <div key={`tl-${idx}`} className="relative flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm border border-white dark:border-[#0A0A0A] ${ev.color} text-white`}>
              {ev.icon === 'ShoppingCart' ? <ShoppingCart size={16} /> : ev.icon === 'MessageCircle' ? <MessageCircle size={16} /> : <Activity size={16} />}
            </div>
            <div className="flex-1 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 shadow-sm mt-1">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">{ev.title}</h4>
                <span className="text-[10px] text-neutral-500 font-medium">{format(ev.date, "d MMM, h:mm a", { locale: es })}</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">{ev.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrescriptionsTab({ prescriptions }: { prescriptions: any[] | undefined }) {
  return (
    <div className={card}>
      <table className="w-full text-left text-sm">
        <thead className={thead}>
          <tr>
            <th className="px-6 py-3">Medicamento</th>
            <th className="px-6 py-3">Dosis</th>
            <th className="px-6 py-3">Próximo Refill</th>
            <th className="px-6 py-3">Adherencia</th>
            <th className="px-6 py-3 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {prescriptions?.length ? (
            prescriptions.map((presc: any, i: number) => (
              <tr key={i}>
                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">{presc.medication}</td>
                <td className="px-6 py-4 text-neutral-500">{presc.dosage}</td>
                <td className="px-6 py-4 text-amber-600 font-medium">{presc.next_refill}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${presc.adherence || 100}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold">{presc.adherence || 100}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-indigo-600 text-xs font-semibold hover:underline">Dispensar</button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No hay prescripciones activas para este paciente.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PurchasesTab({ purchases }: { purchases: any[] | undefined }) {
  return (
    <div className={card}>
      <table className="w-full text-left text-sm">
        <thead className={thead}>
          <tr>
            <th className="px-6 py-3">Fecha</th>
            <th className="px-6 py-3">Producto</th>
            <th className="px-6 py-3">Cant.</th>
            <th className="px-6 py-3">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {purchases?.length ? (
            purchases.map((purchase: any, i: number) => (
              <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30">
                <td className="px-6 py-4 text-neutral-500">{format(new Date(purchase.date), "d MMM yyyy", { locale: es })}</td>
                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">{purchase.brand_name}</td>
                <td className="px-6 py-4 text-neutral-500">{purchase.quantity}</td>
                <td className="px-6 py-4 text-neutral-900 dark:text-white font-medium">${formatCOP(purchase.grand_total)}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No hay compras registradas.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CommunicationTab({ messages, loading }: { messages: any[]; loading: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : messages.length > 0 ? (
        <div className="space-y-4">
          {messages.map((msg: any) => (
            <div key={msg.id} className="p-4 bg-white dark:bg-[#111111] rounded-lg border border-neutral-100 dark:border-neutral-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${msg.demo ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-green-100 text-green-700'}`}>{msg.status}</span>
                  <span className="text-xs text-neutral-500">{msg.sender}</span>
                </div>
                <span className="text-xs text-neutral-500">{format(new Date(msg.timestamp), "d MMM yyyy, h:mm a", { locale: es })}</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 whitespace-pre-wrap">{msg.text || ''}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <MessageCircle size={48} className="mb-4 opacity-20" />
          <p>No hay mensajes recientes por WhatsApp con este paciente.</p>
        </div>
      )}
    </div>
  );
}
