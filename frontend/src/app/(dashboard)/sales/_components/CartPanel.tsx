import { CreditCard, Minus, Plus, Save, ShoppingCart, Tag, Trash2, UserPlus } from 'lucide-react';
import { CartItem, SelectedPatient, formatCOP } from './types';

// Columna derecha: cliente, ventas en espera, carrito y totales
export function CartPanel({ cart, patient, onClearPatient, suspendedCount, onRecover, onDiscount, onRemove, onQty, subtotal, taxes, total, onSuspend, onCharge }: {
  cart: CartItem[];
  patient: SelectedPatient | null;
  onClearPatient: () => void;
  suspendedCount: number;
  onRecover: () => void;
  onDiscount: (id: string, discount: number) => void;
  onRemove: (id: string) => void;
  onQty: (id: string, delta: number) => void;
  subtotal: number;
  taxes: number;
  total: number;
  onSuspend: () => void;
  onCharge: () => void;
}) {
  return (
    <div className="w-full md:w-[400px] flex flex-col bg-[#FDFDFD] dark:bg-[#050505] shrink-0">
      {/* Customer Assignment */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#0A0A0A]">
        <div className="flex items-center space-x-3 text-neutral-600 dark:text-neutral-400">
          <div className={`p-2 rounded-full ${patient ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' : 'bg-neutral-100 dark:bg-neutral-900'}`}>
            <UserPlus size={16} />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm ${patient ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-500 font-medium"}`}>
              {patient ? patient.name : 'Venta Mostrador [F4]'}
            </span>
            {patient?.refillSuggestion && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold tracking-wide">💡 Refill Sugerido: {patient.refillSuggestion}</span>
            )}
          </div>
        </div>
        {patient && (
          <button onClick={onClearPatient} className="text-xs text-red-500 hover:underline">Quitar</button>
        )}
      </div>

      {/* Suspended Sales Indicator */}
      {suspendedCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900 flex justify-between items-center text-xs">
          <span className="text-blue-700 dark:text-blue-400 font-medium">{suspendedCount} venta(s) en espera</span>
          <button onClick={onRecover} className="bg-white dark:bg-[#111111] border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-2 py-1 rounded shadow-sm font-semibold hover:bg-blue-100 transition-colors">
            Recuperar (F8)
          </button>
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white dark:bg-[#000000]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-3">
            <ShoppingCart size={32} className="opacity-30 mb-2" />
            <p className="text-sm font-medium">Carrito vacío</p>
            <p className="text-xs opacity-70">Escanea un producto o presiona F2</p>
          </div>
        ) : (
          cart.map((item, index) => (
            <div key={item.id} className="flex flex-col p-3 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-mono w-4">{index + 1}.</span>
                  <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">{item.name}</h4>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onDiscount(item.id, item.discount === 0 ? 15 : 0)} className={`text-xs ${item.discount > 0 ? 'text-indigo-500' : 'text-neutral-400 hover:text-indigo-500'} transition-colors`} title="Descuento (F3)">
                    <Tag size={14} />
                  </button>
                  <button onClick={() => onRemove(item.id)} className="text-neutral-400 hover:text-red-500 transition-colors" title="Anular (F9 al último)">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between ml-6">
                <div className="flex items-center bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md">
                  <button onClick={() => onQty(item.id, -1)} className="px-2 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-xs font-bold py-1.5">{item.qty}</span>
                  <button onClick={() => onQty(item.id, 1)} className="px-2 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-neutral-500 font-medium">
                    ${formatCOP(item.price)} c/u {item.discount > 0 && <span className="text-indigo-500 ml-1">-{item.discount}%</span>}
                  </div>
                  <div className="font-bold text-sm text-neutral-900 dark:text-white">${formatCOP((item.price * item.qty) * (1 - item.discount / 100))}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals & Checkout */}
      <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#0A0A0A]">
        <div className="space-y-2 mb-5 text-sm font-medium">
          <div className="flex justify-between text-neutral-500">
            <span>Subtotal gravado</span>
            <span>${formatCOP(subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>IVA (19%)</span>
            <span>${formatCOP(taxes)}</span>
          </div>
          <div className="flex justify-between items-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-900 dark:text-white font-bold text-base">Total a Pagar</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">${formatCOP(total)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSuspend}
            disabled={cart.length === 0}
            className="flex-1 flex flex-col items-center justify-center bg-neutral-100 dark:bg-[#111111] disabled:opacity-50 text-neutral-700 dark:text-neutral-300 py-2.5 rounded-lg text-xs font-bold transition-colors border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200"
          >
            <Save size={16} className="mb-1" />
            <span>Suspender (F7)</span>
          </button>
          <button
            onClick={onCharge}
            disabled={cart.length === 0}
            className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 text-white py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm hover:bg-indigo-700"
          >
            <CreditCard size={18} />
            <span>COBRAR (F8)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
