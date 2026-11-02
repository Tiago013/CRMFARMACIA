import Link from 'next/link';
import { Activity, PackagePlus, ShoppingCart, Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';

// Pestaña "Vista General": gasto mensual, condiciones y recomendaciones IA
export function GeneralTab({ patient, aiContext, loadingAi, onGenerateAi }: {
  patient: any;
  aiContext: any;
  loadingAi: boolean;
  onGenerateAi: () => void;
}) {
  const chartData = patient.chart_data?.length ? patient.chart_data : [{ name: 'Ene', gasto: 0 }, { name: 'Feb', gasto: 0 }];

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 space-y-6">
        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity size={16} className="text-indigo-500" />
            Gasto Mensual
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(val) => `$${val / 1000}k`} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="gasto" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Condiciones Médicas</h3>
          <div className="flex flex-wrap gap-2">
            {patient.tags.map((t: string) => (
              <div key={t} className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights Right Panel */}
      <div className="w-full xl:w-80 shrink-0 space-y-6">
        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-[#0A0A0A] border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-4">
            <Sparkles size={16} />
            <h3 className="text-sm font-semibold">IA Recomendaciones</h3>
          </div>

          {loadingAi ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-indigo-100 dark:bg-indigo-900/30 rounded w-3/4"></div>
              <div className="h-4 bg-indigo-100 dark:bg-indigo-900/30 rounded w-full"></div>
            </div>
          ) : aiContext?.recommendations?.length > 0 ? (
            <div className="space-y-4">
              {aiContext.recommendations.map((rec: any, i: number) => (
                <div key={i} className="bg-white dark:bg-[#111111] p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs text-neutral-900 dark:text-white">{rec.product_name}</span>
                    <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{(rec.confidence_score * 100).toFixed(0)}% MATCH</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 mb-3">{rec.reason}</p>
                  <div className="flex gap-2 w-full mt-2">
                    <Link
                      href={`/sales?add_query=${encodeURIComponent(rec.search_query || rec.product_name)}&patient_id=${patient.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-900/50"
                    >
                      <ShoppingCart size={12} /> Al POS
                    </Link>
                    <Link
                      href={`/inventory?add_product=${encodeURIComponent(rec.search_query || rec.product_name)}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-100 dark:border-emerald-900/50"
                    >
                      <PackagePlus size={12} /> Comprar Lote
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs text-neutral-500 mb-3">Solicita a la IA que analice el historial de este paciente.</p>
              <button
                onClick={onGenerateAi}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> Generar Recomendaciones
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
