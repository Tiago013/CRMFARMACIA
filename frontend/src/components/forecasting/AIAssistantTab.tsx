import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrainCircuit, Loader2, Send, ShieldCheck, ShoppingCart, User } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient as api } from '@/lib/axios';

type Result = {
  recommendations: { product_id: string; product_name: string; confidence_score: number; reason: string; search_query: string; source: 'ai' | 'rules' }[];
  evidence: { purchased_categories: string[]; allergies: string; excluded_by_allergy: number };
  notice: string | null;
  usage: { used: number; limit: number };
};

// Asesor de IA por paciente. Todo pasa por el servidor (/api/ai/patient/[id]):
// la clave es de la app, los datos van seudonimizados y cada sugerencia se
// valida contra el inventario y las alergias antes de mostrarse.
export default function AIAssistantTab() {
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState('');
  const [model, setModel] = useState('gemini');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setModel(localStorage.getItem('AI_MODEL') || 'gemini');
    api.get('/crm/patients')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setPatients(list);
        if (list.length) setPatientId(list[0].id);
      })
      .catch(() => toast.error('Error al cargar los pacientes'));
  }, []);

  const changeModel = (value: string) => {
    setModel(value);
    localStorage.setItem('AI_MODEL', value);
  };

  const analyze = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await api.get(`/ai/patient/${patientId}?model=${model}`);
      setResult(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'No se pudo analizar al paciente');
    } finally {
      setLoading(false);
    }
  };

  const usagePct = result ? Math.min(100, (result.usage.used / result.usage.limit) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-indigo-50/50 dark:bg-[#0A0A0A] p-6 rounded-xl border border-indigo-100 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <BrainCircuit className="text-indigo-600 dark:text-indigo-400" /> Asesor Clínico IA (Pacientes)
            </h3>
            <p className="text-sm text-indigo-700/70 dark:text-indigo-300/70 mt-1">Sugiere productos del inventario que el paciente puede tomar de forma segura.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <select
              aria-label="Modelo de IA"
              value={model}
              onChange={(e) => changeModel(e.target.value)}
              className="bg-white dark:bg-[#111] border border-indigo-200 dark:border-indigo-900/30 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="gemini">Gemini (servidor)</option>
              <option value="llama3">Llama 3 (Ollama local)</option>
              <option value="mistral">Mistral (Ollama local)</option>
            </select>
            <select
              aria-label="Paciente"
              value={patientId}
              onChange={(e) => { setPatientId(e.target.value); setResult(null); }}
              disabled={patients.length === 0}
              className="md:w-64 bg-white dark:bg-[#111] border border-indigo-200 dark:border-indigo-900/30 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
            >
              {patients.length === 0 ? <option value="">Cargando pacientes…</option> : patients.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
            <button
              onClick={analyze}
              disabled={loading || !patientId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Analizar Paciente
            </button>
          </div>
        </div>

        {!result ? (
          <div className="bg-white/50 dark:bg-[#111] border border-dashed border-indigo-200 dark:border-neutral-800 p-8 rounded-lg flex flex-col items-center text-center">
            <User size={32} className="text-indigo-300 dark:text-indigo-800 mb-3" />
            <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">Selecciona un paciente y pulsa "Analizar Paciente"</p>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/50 mt-1 max-w-md">A la IA solo llegan alergias, condiciones, rango de edad y categorías que compra: nunca el nombre, el documento ni el teléfono.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {result.notice && <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">{result.notice}</p>}

            {result.recommendations.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay productos con stock que cumplan las reglas de seguridad para este paciente.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {result.recommendations.map(rec => (
                  <div key={rec.product_id} className="bg-white dark:bg-[#111] p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-sm text-neutral-900 dark:text-white">{rec.product_name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${rec.source === 'rules' ? 'bg-neutral-100 text-neutral-600' : 'bg-indigo-100 text-indigo-700'}`}>
                        {rec.source === 'rules' ? 'REGLA' : `IA · ${Math.round(rec.confidence_score * 100)}%`}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{rec.reason}</p>
                    <Link
                      href={`/sales?add_query=${encodeURIComponent(rec.search_query)}&patient_id=${patientId}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                    >
                      <ShoppingCart size={12} /> Llevar al POS
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-[#111] rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-1">
              <p className="font-semibold flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> Por qué estas sugerencias</p>
              <p>Categorías que compra: {result.evidence.purchased_categories.join(', ') || 'sin historial'}</p>
              <p>Alergias: {result.evidence.allergies}{result.evidence.excluded_by_allergy > 0 && ` · ${result.evidence.excluded_by_allergy} productos excluidos por contraindicación`}</p>
              <p>Solo se sugieren productos con stock que el paciente aún no compra.</p>
            </div>

            {model === 'gemini' && (
              <div>
                <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                  <span>Consultas de IA de hoy en esta farmacia</span>
                  <span className="font-mono">{result.usage.used} / {result.usage.limit}</span>
                </div>
                <div className="w-full bg-neutral-500/20 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${usagePct < 80 ? 'bg-indigo-500' : 'bg-red-500'}`} style={{ width: `${usagePct}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
