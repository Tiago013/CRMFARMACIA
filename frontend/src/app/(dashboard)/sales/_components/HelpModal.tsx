import { Keyboard } from 'lucide-react';

const SHORTCUTS = [
  ['F1', 'Ayuda'],
  ['F2', 'Buscar / Escanear Código'],
  ['F3', 'Descuento al último ítem'],
  ['F4', 'Asignar Cliente'],
  ['F5', 'Cambiar método pago'],
  ['F6', 'Pago rápido exacto (Efectivo)'],
  ['F7', 'Suspender Venta actual'],
  ['F8', 'Cobrar / Recuperar Suspendida'],
  ['F9', 'Anular último ítem'],
  ['Esc', 'Cancelar / Cerrar Modales'],
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0A0A0A] rounded-xl shadow-2xl w-full max-w-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between">
          <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Keyboard size={18} /> Atajos de Teclado POS Pro
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <span className="font-bold text-indigo-600">{key}</span> <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
            </div>
          ))}
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-400 text-center font-medium border-t border-amber-200 dark:border-amber-900/50">
          💡 Un cajero experto usa estos atajos para cobrar en menos de 5 segundos sin tocar el mouse.
        </div>
      </div>
    </div>
  );
}
