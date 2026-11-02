import { PaymentMethod, formatCOP } from './types';

const METHODS: { id: PaymentMethod; icon: string; label: string }[] = [
  { id: 'cash', icon: '💵', label: 'Efectivo' },
  { id: 'card', icon: '💳', label: 'Tarjeta' },
  { id: 'mixed', icon: '🔄', label: 'Mixto' },
  { id: 'fiado', icon: '📝', label: 'Fiado' },
];

export function CheckoutModal({ total, paymentMethod, onPaymentMethod, cashReceived, onCashReceived, hasPatient, onClose, onConfirm }: {
  total: number;
  paymentMethod: PaymentMethod;
  onPaymentMethod: (method: PaymentMethod) => void;
  cashReceived: number;
  onCashReceived: (value: number) => void;
  hasPatient: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0A0A0A] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Orquestador de Pagos</h3>
            <p className="text-xs text-neutral-500">Selecciona el método de pago [F5]</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6 bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900">
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">TOTAL A COBRAR</p>
            <p className="text-5xl font-black text-neutral-900 dark:text-white tracking-tight">${formatCOP(total)}</p>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => onPaymentMethod(method.id)}
                className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${paymentMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
              >
                <span className="text-2xl mb-1">{method.icon}</span>
                <span className="text-[10px] font-bold uppercase">{method.label}</span>
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">EFECTIVO RECIBIDO</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => onCashReceived(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 text-lg font-bold bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-neutral-50 dark:bg-[#111111] rounded-lg border border-neutral-200 dark:border-neutral-800">
                <span className="font-bold text-neutral-600 dark:text-neutral-400">CAMBIO A DEVOLVER:</span>
                <span className={`text-xl font-black ${cashReceived >= total ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  ${formatCOP(Math.max(0, cashReceived - total))}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'fiado' && !hasPatient && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-400 mb-6 font-medium">
              ⚠️ Error: Debes asignar un paciente (F4) para registrar una cuenta por cobrar (Fiado).
            </div>
          )}

          <button
            onClick={onConfirm}
            disabled={paymentMethod === 'cash' && cashReceived < total || (paymentMethod === 'fiado' && !hasPatient)}
            className="w-full py-4 bg-indigo-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 text-white rounded-lg text-lg font-black tracking-wide shadow-lg hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
          >
            CONFIRMAR PAGO <span className="text-sm opacity-80 ml-2 font-normal">(Enter o F6)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
