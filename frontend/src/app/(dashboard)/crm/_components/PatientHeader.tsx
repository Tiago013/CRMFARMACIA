import { Clock, CreditCard, DollarSign, Edit2, HeartPulse, MessageCircle, Phone, RefreshCw, ShieldAlert, ShoppingCart } from 'lucide-react';
import { CircularScore, KPICard, formatCOP } from './widgets';

// Encabezado de la ficha 360°: alerta clínica, datos, acciones rápidas y KPIs
export function PatientHeader({ patient, onEdit, onMessage }: {
  patient: any;
  onEdit: () => void;
  onMessage: () => void;
}) {
  const salesCount: number = patient.sales_count || 0;
  // Compras de los últimos 90 días contra los 90 anteriores
  const visits = patient.visits;
  const visitsTrend = visits?.previous > 0 ? Math.round(((visits.current - visits.previous) / visits.previous) * 100) : undefined;

  return (
    <>
      {/* Alerta clínica según las condiciones registradas del paciente */}
      {patient.tags.includes('Diabético') && (
        <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 px-6 py-2.5 flex items-center gap-3">
          <ShieldAlert size={16} className="text-red-600 dark:text-red-400" />
          <span className="text-xs font-semibold text-red-900 dark:text-red-200">ALERTA CRÍTICA: Paciente Diabético. Verificar interacción con Corticoides.</span>
        </div>
      )}

      {/* Header Profile */}
      <div className="px-8 py-6 bg-white dark:bg-[#0A0A0A] border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-6">
            <CircularScore score={patient.score} />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">{patient.name}</h2>
                <button onClick={onEdit} className="text-neutral-400 hover:text-indigo-600 transition-colors" title="Editar Perfil">
                  <Edit2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                <span className="flex items-center gap-1.5"><Phone size={14} /> {patient.phone}</span>
                <span>•</span>
                <span>ID: {patient.id.toString().substring(0, 8)}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">LTV: ${formatCOP(patient.ltv)}</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {patient.tags.map((t: string, idx: number) => (
                  <span key={`${t}-${idx}`} className="bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded text-xs font-medium border border-neutral-200 dark:border-neutral-800">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm group">
              <ShoppingCart size={20} className="mb-1 text-neutral-500 group-hover:text-indigo-600" />
              <span className="text-[10px] font-semibold">POS</span>
            </button>
            <button onClick={onMessage} className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-[#25D366] hover:text-[#25D366] transition-colors shadow-sm group">
              <MessageCircle size={20} className="mb-1 text-neutral-500 group-hover:text-[#25D366]" />
              <span className="text-[10px] font-semibold">Mensaje</span>
            </button>
            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-amber-500 hover:text-amber-600 transition-colors shadow-sm group">
              <RefreshCw size={20} className="mb-1 text-neutral-500 group-hover:text-amber-600" />
              <span className="text-[10px] font-semibold">Refill</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Row: todo sale de las ventas reales del paciente */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 py-6">
        <KPICard label="Total Compras" value={salesCount} trend={visitsTrend} icon={CreditCard} />
        <KPICard label="Ticket Promedio" value={salesCount ? `$${formatCOP(Math.round((patient.ltv || 0) / salesCount))}` : '—'} icon={DollarSign} />
        <KPICard label="Adherencia (Refills)" value={patient.score === null || patient.score === undefined ? 'Sin datos' : `${patient.score}%`} icon={HeartPulse} />
        <KPICard label="Frecuencia Visita" value={patient.avg_interval_days ? `Cada ${patient.avg_interval_days} días` : 'Sin datos'} icon={Clock} />
      </div>
    </>
  );
}
