'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, Calendar, HeartPulse, ShoppingCart, Send, Sparkles, TrendingDown, TrendingUp, AlertTriangle, MessageCircle, Activity, DollarSign, Clock, RefreshCw, FileText, CheckCircle2, ShieldAlert, CreditCard, ChevronRight, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiClient as api } from '@/lib/axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// --- Subcomponents ---

const CircularScore = ({ score }: { score: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let color = 'text-red-500';
  if (score >= 80) color = 'text-emerald-500';
  else if (score >= 60) color = 'text-blue-500';
  else if (score >= 40) color = 'text-amber-500';

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle cx="48" cy="48" r={radius} className="stroke-current text-neutral-100 dark:text-neutral-800" strokeWidth="8" fill="transparent" />
        <circle 
          cx="48" cy="48" r={radius} 
          className={`stroke-current ${color} transition-all duration-1000 ease-out`} 
          strokeWidth="8" fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round" 
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-neutral-900 dark:text-white leading-none">{score}</span>
        <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5">Score</span>
      </div>
    </div>
  );
};

const KPICard = ({ label, value, trend, icon: Icon }: any) => (
  <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 flex items-start gap-3 shadow-sm">
    <div className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-md shrink-0 text-neutral-600 dark:text-neutral-400">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="flex items-end gap-2 mt-0.5">
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{value}</span>
        {trend && (
          <span className={`text-[10px] font-medium flex items-center ${trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend > 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  </div>
);

// --- Main Page ---

export default function CRMPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  
  const [aiContext, setAiContext] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [timelines, setTimelines] = useState<any>({});
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ name: '', phone: '', tags: '' });

  // Fetch Patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get('/crm/patients', { params: { limit: 50, search: searchQuery } });
        const data = Array.isArray(res.data) ? res.data : [];
        const mapped = data.map((p: any) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`.trim() || p.first_name,
          phone: p.phone || '',
          lastVisit: p.last_purchase_date || 'N/A',
          tags: Array.from(new Set([...(p.preferences?.condiciones ? p.preferences.condiciones.split(';').filter(Boolean) : []), ...(p.tags || []), p.segment].filter(Boolean))),
          ltv: p.ltv || 0,
          segment: p.segment || 'Regular',
          initials: `${(p.first_name || '')[0] || ''}${(p.last_name || '')[0] || ''}`.toUpperCase(),
          preferences: p.preferences || {},
          score: 0, // Will be loaded with full profile
          purchase_history: [],
          timeline: [],
          chart_data: []
        }));
        setPatients(mapped);
        if (!selectedPatientId && mapped.length > 0) setSelectedPatientId(mapped[0].id);
      } catch (e) {
        console.error('Error cargando pacientes:', e);
      }
    };
    const timeout = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const activePatient = patients.find(p => p.id === selectedPatientId);
  const activeTimeline = activePatient?.timeline || [];
  const mockChartData = activePatient?.chart_data?.length ? activePatient.chart_data : [
    { name: 'Ene', gasto: 0 }, { name: 'Feb', gasto: 0 }
  ];

  useEffect(() => {
    if (!selectedPatientId) return;
    const fetchPatientProfile = async () => {
      try {
        const res = await api.get(`/crm/patients/${selectedPatientId}`);
        setPatients(prev => prev.map(p => {
          if (p.id === selectedPatientId) {
            return {
              ...p,
              score: res.data.score || 50,
              purchase_history: res.data.purchase_history || [],
              timeline: res.data.timeline || [],
              chart_data: res.data.chart_data || [],
              ltv: res.data.ltv || p.ltv
            };
          }
          return p;
        }));
      } catch (e) {
        console.error('Error fetching patient profile', e);
      }
    };
    fetchPatientProfile();

    const fetchAiContext = async () => {
      setLoadingAi(true);
      try {
        const res = await api.get(`/ai/patient/${selectedPatientId}`);
        setAiContext(res.data);
      } catch (e) {
        setAiContext(null);
      } finally {
        setLoadingAi(false);
      }
    };
    fetchAiContext();
    setActiveTab('general'); // Reset tab on patient change
  }, [selectedPatientId]);

  return (
    <div className="flex flex-col h-full bg-[#FBFBFB] dark:bg-[#0A0A0A]">
      <div className="flex justify-between items-center px-8 py-5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000]">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">Centro Operativo de Pacientes</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Vista 360° clínico-comercial inteligente.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-sm">
          <Plus size={14} /> Añadir Paciente
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* Left Sidebar (List) */}
        <div className="w-full md:w-[320px] flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#050505] shrink-0">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="relative group">
              <Search className="absolute left-2.5 top-2 text-neutral-400" size={14} />
              <input 
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar paciente o etiqueta..." 
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-100 dark:bg-[#111111] border-none rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
              />
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] font-semibold rounded-full whitespace-nowrap cursor-pointer">VIP</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-semibold rounded-full whitespace-nowrap cursor-pointer">Alto Riesgo</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold rounded-full whitespace-nowrap cursor-pointer">Crónicos</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {patients.map((p) => {
                const isActive = p.id === selectedPatientId;
                return (
                  <li key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`p-4 cursor-pointer transition-colors ${isActive ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/30'}`}>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center text-xs font-semibold shrink-0">
                        {p.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-900 dark:text-indigo-200' : 'text-neutral-900 dark:text-white'}`}>{p.name}</h3>
                          {p.score >= 80 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" title="Alta Adherencia"></div>}
                        </div>
                        <p className="text-xs text-neutral-500 truncate">{p.phone}</p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {p.tags.slice(0,2).map((t: string, idx: number) => (
                            <span key={`${t}-${idx}`} className="text-[9px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-500">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right Side (360 View) */}
        {activePatient ? (
          <div className="flex-1 flex flex-col min-w-0 bg-[#FBFBFB] dark:bg-[#000000] overflow-y-auto">
            
            {/* Critical Alerts Banner (Mocked) */}
            {activePatient.tags.includes('Diabético') && (
              <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 px-6 py-2.5 flex items-center gap-3">
                <ShieldAlert size={16} className="text-red-600 dark:text-red-400" />
                <span className="text-xs font-semibold text-red-900 dark:text-red-200">ALERTA CRÍTICA: Paciente Diabético. Verificar interacción con Corticoides.</span>
              </div>
            )}
            
            {/* Header Profile */}
            <div className="px-8 py-6 bg-white dark:bg-[#0A0A0A] border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-6">
                  <CircularScore score={activePatient.score} />
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">{activePatient.name}</h2>
                      <button onClick={() => setShowEditModal(true)} className="text-neutral-400 hover:text-indigo-600 transition-colors" title="Editar Perfil">
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                      <span className="flex items-center gap-1.5"><Phone size={14} /> {activePatient.phone}</span>
                      <span>•</span>
                      <span>ID: {activePatient.id.toString().substring(0,8)}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">LTV: ${activePatient.ltv.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {activePatient.tags.map((t: string, idx: number) => (
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
                  <button onClick={() => setShowWaModal(true)} className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-[#25D366] hover:text-[#25D366] transition-colors shadow-sm group">
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

            {/* KPIs Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 py-6">
              <KPICard 
                label="Total Compras" 
                value={activePatient.purchase_history?.length || 0} 
                trend={activePatient.purchase_history?.length > 5 ? 12 : -2} 
                icon={CreditCard} 
              />
              <KPICard 
                label="Ticket Promedio" 
                value={`$${Math.round((activePatient.ltv || 0) / (activePatient.purchase_history?.length || 1)).toLocaleString()}`} 
                trend={5} 
                icon={DollarSign} 
              />
              <KPICard 
                label="Adherencia (Refills)" 
                value={`${activePatient.score || 0}%`} 
                trend={activePatient.score > 70 ? 5 : -5} 
                icon={HeartPulse} 
              />
              <KPICard 
                label="Frecuencia Visita" 
                value={`Cada ${Math.max(7, Math.floor(90 / (activePatient.purchase_history?.length || 1)))} días`} 
                trend={0} 
                icon={Clock} 
              />
            </div>

            {/* Tabs */}
            <div className="px-8 border-b border-neutral-200 dark:border-neutral-800 flex gap-6">
              {[
                { id: 'general', label: 'Vista General' },
                { id: 'compras', label: 'Compras' },
                { id: 'prescripciones', label: 'Prescripciones' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'comunicacion', label: 'Comunicación' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-8 flex-1">
              {activeTab === 'general' && (
                <div className="flex flex-col xl:flex-row gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-indigo-500" />
                        Gasto Mensual
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mockChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(val) => `$${val/1000}k`} />
                            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="gasto" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                      <h3 className="text-sm font-semibold mb-4">Condiciones Médicas</h3>
                      <div className="flex flex-wrap gap-2">
                        {activePatient.tags.map((t:string) => (
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
                          {aiContext.recommendations.map((rec:any, i:number) => (
                            <div key={i} className="bg-white dark:bg-[#111111] p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-xs text-neutral-900 dark:text-white">{rec.product_name}</span>
                                <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{(rec.confidence_score*100).toFixed(0)}% MATCH</span>
                              </div>
                              <p className="text-[10px] text-neutral-500 mt-1">{rec.reason}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500">No hay recomendaciones en este momento.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="max-w-3xl">
                  <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-px before:bg-neutral-200 dark:before:bg-neutral-800 space-y-8">
                    {activeTimeline.map((ev:any, idx: number) => (
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
              )}

              {activeTab === 'prescripciones' && (
                <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-3">Medicamento</th>
                        <th className="px-6 py-3">Dosis</th>
                        <th className="px-6 py-3">Próximo Refill</th>
                        <th className="px-6 py-3">Adherencia</th>
                        <th className="px-6 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      <tr>
                        <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">Losartán 50mg</td>
                        <td className="px-6 py-4 text-neutral-500">1 pastilla / 12h</td>
                        <td className="px-6 py-4 text-amber-600 font-medium">En 4 días</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full w-[95%]"></div>
                            </div>
                            <span className="text-[10px] font-bold">95%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-indigo-600 text-xs font-semibold hover:underline">Dispensar</button>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">Metformina 850mg</td>
                        <td className="px-6 py-4 text-neutral-500">1 pastilla / 24h</td>
                        <td className="px-6 py-4 text-neutral-500">En 15 días</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full w-[75%]"></div>
                            </div>
                            <span className="text-[10px] font-bold">75%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-indigo-600 text-xs font-semibold hover:underline">Dispensar</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'compras' && (
                <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Producto</th>
                        <th className="px-6 py-3">Cant.</th>
                        <th className="px-6 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {activePatient.purchase_history?.length > 0 ? (
                        activePatient.purchase_history.map((purchase: any, i: number) => (
                          <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30">
                            <td className="px-6 py-4 text-neutral-500">{format(new Date(purchase.date), "d MMM yyyy", { locale: es })}</td>
                            <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">{purchase.brand_name}</td>
                            <td className="px-6 py-4 text-neutral-500">{purchase.quantity}</td>
                            <td className="px-6 py-4 text-neutral-900 dark:text-white font-medium">${purchase.grand_total.toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No hay compras registradas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'comunicacion' && (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                  <MessageCircle size={48} className="mb-4 opacity-20" />
                  <p>No hay mensajes recientes por WhatsApp con este paciente.</p>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#FBFBFB] dark:bg-[#000000]">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4 text-neutral-400">
              <Users size={24} />
            </div>
            <p className="text-neutral-500 font-medium">Selecciona un paciente del directorio</p>
          </div>
        )}
      </div>

      {/* MODAL: Editar Perfil Ampliado (Fase 25.15) */}
      {showEditModal && activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Perfil del Paciente</h3>
                <p className="text-xs text-neutral-500">Gestión de datos clínicos y comerciales.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="edit-patient-form" onSubmit={(e) => { e.preventDefault(); setShowEditModal(false); }} className="space-y-6">
                
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Información Personal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Nombre Completo</label>
                      <input type="text" defaultValue={activePatient.name} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Cédula / DNI</label>
                      <input type="text" placeholder="CC 1.023.456.789" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Teléfono</label>
                      <input type="tel" defaultValue={activePatient.phone} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Email</label>
                      <input type="email" placeholder="correo@ejemplo.com" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Fecha de Nacimiento</label>
                      <input type="date" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Dirección</label>
                      <input type="text" placeholder="Cra 45 #12-34" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>

                <hr className="border-neutral-200 dark:border-neutral-800" />

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Perfil Clínico</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">EPS / Aseguradora</label>
                      <select className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500">
                        <option>Sura</option>
                        <option>Coomeva</option>
                        <option>Sanitas</option>
                        <option>Nueva EPS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Grupo Sanguíneo</label>
                      <select className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500">
                        <option>O+</option>
                        <option>A-</option>
                        <option>B+</option>
                        <option>AB+</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Alergias Conocidas</label>
                      <input type="text" placeholder="Ej: Penicilina, Aspirina (separadas por coma)" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Condiciones Crónicas / Tags Clínicos</label>
                      <input type="text" defaultValue={activePatient.tags.join(", ")} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Notas Médicas</label>
                      <textarea rows={2} placeholder="Observaciones generales..." className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500"></textarea>
                    </div>
                  </div>
                </div>

                <hr className="border-neutral-200 dark:border-neutral-800" />

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Familia y Contacto</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Contacto de Emergencia</label>
                      <input type="text" placeholder="Nombre completo" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Teléfono Emergencia</label>
                      <input type="tel" placeholder="+57..." className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Grupo Familiar (Búsqueda)</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 text-neutral-400" size={14} />
                        <input type="text" placeholder="Buscar y vincular familiar..." className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between bg-neutral-50 dark:bg-[#111111]">
              <button type="button" className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Eliminar Paciente</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-1.5 rounded-md text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800">Cancelar</button>
                <button type="submit" form="edit-patient-form" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors">Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WA Modal Mock */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl w-[400px]">
            <h3 className="font-bold mb-4">Mensaje WhatsApp a {activePatient?.name}</h3>
            <textarea className="w-full border rounded p-2 text-sm mb-4 bg-neutral-50 dark:bg-neutral-900" rows={4} placeholder="Escribe el mensaje..."></textarea>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowWaModal(false)} className="px-4 py-2 text-sm">Cancelar</button>
              <button onClick={() => setShowWaModal(false)} className="px-4 py-2 bg-[#25D366] text-white rounded text-sm font-bold">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function tabTitle(id: string) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
