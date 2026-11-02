import { Banknote, Lock, Minus, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { CashDrawer } from './useCashDrawer';
import { BILLS, COINS, Denominations, formatCOP } from './types';

// Bloquea el POS mientras la caja está cerrada
export function ClosedDrawerOverlay({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="absolute inset-0 z-[40] bg-white/80 dark:bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
      <div className="bg-white dark:bg-[#0A0A0A] p-10 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 text-center max-w-md w-full animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={48} className="text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-3">Caja Cerrada</h2>
        <p className="text-neutral-500 mb-8 text-sm">Debes realizar la apertura de caja y declarar la base inicial (sencillo) para empezar a facturar.</p>
        <button
          onClick={onOpen}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-colors flex items-center justify-center gap-2"
        >
          <Lock size={20} className="open" /> Realizar Apertura de Caja
        </button>
      </div>
    </div>
  );
}

function DenominationRows({ title, items, denominations, onChange }: {
  title: string;
  items: typeof BILLS | typeof COINS;
  denominations: Denominations;
  onChange: (key: keyof Denominations, value: number) => void;
}) {
  return (
    <div className="space-y-4">
      <h5 className="text-[10px] font-black text-neutral-500 mb-4 uppercase tracking-widest bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full w-max">{title}</h5>
      {items.map(d => (
        <div key={d.key} className="flex items-center gap-4 group">
          <span className="w-20 text-sm font-bold text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{d.label}</span>
          <input
            type="number"
            min="0"
            value={denominations[d.key] || ''}
            onChange={(e) => onChange(d.key, Number(e.target.value))}
            placeholder="0"
            className="w-20 px-3 py-2 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-bold shadow-sm transition-all"
          />
          <span className="flex-1 text-right text-sm font-black text-neutral-900 dark:text-white opacity-50 group-hover:opacity-100 transition-opacity">
            ${(denominations[d.key] * d.val).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// Apertura (base inicial) y cierre (arqueo con descuadre) de caja
export function DrawerModal({ drawer }: { drawer: CashDrawer }) {
  const { drawerMode, drawerBase, drawerSales, drawerCashIn, drawerCashOut, declaredTotal, denominations, setDenominations } = drawer;
  const isOpening = drawerMode === 'open';
  const expected = drawerBase + drawerSales;
  const difference = declaredTotal - expected;

  const confirm = () => {
    if (isOpening) {
      drawer.saveDrawerState('open', declaredTotal, 0, 0, 0);
      toast.success(`Caja abierta exitosamente con base de $${declaredTotal.toLocaleString()}`);
    } else {
      drawer.saveDrawerState('closed', 0, 0, 0, 0);
      toast.success(`Turno finalizado. Descuadre: $${difference.toLocaleString()}`);
    }
    drawer.setShowDrawerModal(false);
  };

  const updateDenomination = (key: keyof Denominations, value: number) =>
    setDenominations(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-4xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className={`p-6 border-b flex justify-between items-center bg-white dark:bg-neutral-900 ${isOpening ? 'border-indigo-500/20' : 'border-rose-500/20'}`}>
          <div>
            <h3 className="text-xl font-black flex items-center gap-2 text-neutral-900 dark:text-white">
              <span className={`p-2 rounded-lg ${isOpening ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                <Lock size={20} />
              </span>
              {isOpening ? 'Apertura de Caja' : 'Cierre de Caja'}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {isOpening ? 'Ingresa el conteo físico de tu base inicial.' : 'Declara el conteo físico final para tu arqueo.'}
            </p>
          </div>
          <button onClick={() => drawer.setShowDrawerModal(false)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors bg-neutral-100 dark:bg-neutral-900 rounded-full p-2">
            <Minus size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 h-full max-h-[70vh] overflow-hidden">
          {/* Left Column: Summary */}
          <div className="md:col-span-1 p-6 border-r border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto flex flex-col">
            <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-6 pb-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
              <Save size={14} /> Resumen de Sistema
            </h4>

            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center text-sm font-medium bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500">Base Registrada:</span>
                <span className="text-neutral-900 dark:text-white font-bold">${formatCOP(drawerBase)}</span>
              </div>
              {!isOpening && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-medium bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                    <span className="text-emerald-700 dark:text-emerald-400">+ Efectivo Recibido:</span>
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold">${formatCOP(drawerCashIn)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-100 dark:border-rose-500/20">
                    <span className="text-rose-700 dark:text-rose-400">- Cambios Entregados:</span>
                    <span className="text-rose-800 dark:text-rose-300 font-bold">-${formatCOP(drawerCashOut)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-neutral-500 pt-1 px-3">
                    <span>(= Ventas Netas: ${formatCOP(drawerSales)})</span>
                  </div>
                </div>
              )}

              <div className="pt-6 mt-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-neutral-500 text-xs tracking-wider uppercase">TOTAL ESPERADO:</span>
                  <span className="text-xl font-black text-neutral-900 dark:text-white">${formatCOP(isOpening ? 0 : expected)}</span>
                </div>

                <div className="flex justify-between items-center mb-8">
                  <span className="font-bold text-neutral-500 text-xs tracking-wider uppercase">TOTAL DECLARADO:</span>
                  <span className={`text-xl font-black ${isOpening ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>${formatCOP(declaredTotal)}</span>
                </div>

                {!isOpening && (
                  declaredTotal === 0 ? (
                    <div className="p-5 rounded-xl border bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 flex flex-col gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-neutral-500">Diferencia (Descuadre)</span>
                      <span className="text-lg font-bold text-neutral-400 dark:text-neutral-500">
                        Pendiente de conteo...
                      </span>
                    </div>
                  ) : (
                    <div className={`p-5 rounded-xl border flex flex-col gap-2 ${difference >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'}`}>
                      <span className={`text-xs font-black uppercase tracking-wider ${difference >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>Diferencia (Descuadre)</span>
                      <span className={`text-3xl font-black flex items-center gap-2 ${difference >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {difference >= 0 ? <Plus size={24} /> : <Minus size={24} />}
                        ${formatCOP(Math.abs(difference))}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={confirm}
                className={`w-full py-4 text-white rounded-xl font-black text-lg shadow-xl transition-all ${isOpening ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' : 'bg-neutral-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-black/20'}`}
              >
                {isOpening ? 'Confirmar Apertura' : 'Finalizar Turno y Cerrar Caja'}
              </button>
            </div>
          </div>

          {/* Right Column: Physical Denominations */}
          <div className="md:col-span-2 p-8 overflow-y-auto bg-white dark:bg-[#0A0A0A]">
            <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-6 pb-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
              <Banknote size={14} className="text-indigo-500" /> Desglose de Moneda Local (COP)
            </h4>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <DenominationRows title="Billetes" items={BILLS} denominations={denominations} onChange={updateDenomination} />
              <DenominationRows title="Monedas" items={COINS} denominations={denominations} onChange={updateDenomination} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
