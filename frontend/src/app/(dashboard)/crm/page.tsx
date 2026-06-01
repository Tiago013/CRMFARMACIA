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
  const [editFormData, setEditFormData] = useState({ first_name: '', last_name: '', phone: '', document_id: '', email: '', address: '', eps: '', blood_group: '', birth_date: '', allergies: '', medical_notes: '', emergency_contact_name: '', emergency_contact_phone: '' });
  const [addFormData, setAddFormData] = useState({ first_name: '', last_name: '', phone: '', document_id: '', email: '', address: '', eps: '', blood_group: '', birth_date: '', allergies: '', medical_notes: '', emergency_contact_name: '', emergency_contact_phone: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [waMessages, setWaMessages] = useState<any[]>([]);
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [waRecords, setWaRecords] = useState<any>({sales: [], invoices: []});
  const [waLoading, setWaLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | ''>('');

  // Fetch Patients
  const fetchPatients = async (query: string = searchQuery) => {
    try {
      const res = await fetch(`/api/crm/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      const actualData = Array.isArray(data) ? data : [];
      const mapped = actualData.map((p: any) => ({
        id: p.id,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        document_id: p.document_id || '',
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.first_name,
        phone: p.phone || '',
        lastVisit: p.last_purchase_date || 'N/A',
        tags: Array.from(new Set([...(p.preferences?.condiciones ? p.preferences.condiciones.split(';').filter(Boolean) : []), ...(p.tags || []), p.segment].filter(Boolean))),
        ltv: p.ltv || 0,
        segment: p.segment || 'Regular',
        initials: `${(p.first_name || '')[0] || ''}${(p.last_name || '')[0] || ''}`.toUpperCase(),
        preferences: p.preferences || {},
        score: 0,
        purchase_history: [],
        timeline: [],
        chart_data: []
      }));
      setPatients(mapped);
      return mapped;
    } catch (e) {
      console.error('Error cargando pacientes:', e);
      return [];
    }
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const mapped = await fetchPatients(searchQuery);
      if (!selectedPatientId && mapped.length > 0) setSelectedPatientId(mapped[0].id);
    }, 300);
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
        const res = await fetch(`/api/crm/patients/${selectedPatientId}`);
        const data = await res.json();
        setPatients(prev => prev.map(p => {
          if (p.id === selectedPatientId) {
            return {
              ...p,
              first_name: data.first_name || p.first_name,
              last_name: data.last_name || p.last_name,
              document_id: data.document_id || p.document_id,
              phone: data.phone || p.phone,
              preferences: data.preferences || p.preferences,
              score: data.score || 50,
              purchase_history: data.purchase_history || [],
              timeline: data.timeline || [],
              chart_data: data.chart_data || [],
              ltv: data.ltv || p.ltv
            };
          }
          return p;
        }));
      } catch (e) {
        console.error('Error fetching patient profile', e);
      }
    };
    fetchPatientProfile();

    setAiContext(null);
    setActiveTab('general'); // Reset tab on patient change
  }, [selectedPatientId]);

  const generateAiRecommendations = async () => {
    if (!selectedPatientId) return;

    // Check cache first
    const cacheKey = `ai_recommendations_${selectedPatientId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setAiContext(JSON.parse(cached));
        return;
      } catch (e) {
        // ignore cache error and fetch
      }
    }

    setLoadingAi(true);
    try {
      const selectedModel = localStorage.getItem('AI_MODEL') || 'gemini';

      // Track quota usage only for Gemini
      if (selectedModel === 'gemini') {
        // Track quota usage (RPM)
        let rpmCount = parseInt(sessionStorage.getItem('gemini_rpm_count') || localStorage.getItem('gemini_rpm_count') || '0');
        let rpmReset = parseInt(sessionStorage.getItem('gemini_rpm_reset') || localStorage.getItem('gemini_rpm_reset') || '0');
        if (!rpmReset || Date.now() > rpmReset) {
          rpmReset = Date.now() + 60000;
          rpmCount = 0;
          localStorage.setItem('gemini_rpm_reset', rpmReset.toString());
        }
        rpmCount++;
        localStorage.setItem('gemini_rpm_count', rpmCount.toString());

        // Track quota usage (RPD)
        let rpdCount = parseInt(sessionStorage.getItem('gemini_rpd_count') || localStorage.getItem('gemini_rpd_count') || '0');
        let rpdReset = parseInt(sessionStorage.getItem('gemini_rpd_reset') || localStorage.getItem('gemini_rpd_reset') || '0');
        if (!rpdReset || Date.now() > rpdReset) {
          rpdReset = Date.now() + (24 * 60 * 60 * 1000);
          rpdCount = 0;
          localStorage.setItem('gemini_rpd_reset', rpdReset.toString());
        }
        rpdCount++;
        localStorage.setItem('gemini_rpd_count', rpdCount.toString());
      }

      const res = await api.get(`/ai/patient/${selectedPatientId}?model=${selectedModel}`);
      setAiContext(res.data);
      sessionStorage.setItem(cacheKey, JSON.stringify(res.data));
    } catch (e) {
      setAiContext(null);
    } finally {
      setLoadingAi(false);
    }
  };


  // Fetch WhatsApp Messages when Communication tab is active
  useEffect(() => {
    if (activeTab === 'comunicacion' && selectedPatientId) {
      const fetchMessages = async () => {
        setWaLoading(true);
        try {
          const res = await api.get(`/communications/whatsapp/${selectedPatientId}/messages`);
          setWaMessages(res.data || []);
        } catch(e) { console.error(e); }
        finally { setWaLoading(false); }
      };
      fetchMessages();
    }
  }, [activeTab, selectedPatientId]);

  // Fetch WA data when modal opens
  useEffect(() => {
    if (showWaModal && selectedPatientId) {
      // Clean up previous state
      setSelectedTemplate(null);
      setSelectedRecordId('');
      
      const fetchWAData = async () => {
        try {
          const [tempRes, recRes] = await Promise.all([
            api.get('/whatsapp/templates').catch(() => ({ data: [] })),
            api.get(`/crm/patients/${selectedPatientId}/sales`).catch(() => ({ data: [] }))
          ]);
          setWaTemplates(tempRes.data || []);
          setWaRecords({ sales: Array.isArray(recRes.data) ? recRes.data : [] });
        } catch(e) { console.error(e); }
      };
      fetchWAData();
    }
  }, [showWaModal, selectedPatientId]);

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
                      <button onClick={() => {
                        setEditFormData({
                          first_name: activePatient?.first_name || '',
                          last_name: activePatient?.last_name || '',
                          phone: activePatient?.phone || '',
                          document_id: activePatient?.document_id || '',
                          email: activePatient?.email || activePatient?.preferences?.email || '',
                          address: activePatient?.address || activePatient?.preferences?.address || '',
                          eps: activePatient?.eps || activePatient?.preferences?.eps || 'Sura',
                          blood_group: activePatient?.blood_group || activePatient?.preferences?.blood_group || activePatient?.preferences?.blood_type || 'O+',
                          birth_date: activePatient?.birth_date ? new Date(activePatient.birth_date).toISOString().split('T')[0] : '',
                          allergies: activePatient?.allergies || '',
                          medical_notes: activePatient?.medical_notes || '',
                          emergency_contact_name: activePatient?.emergency_contact_name || '',
                          emergency_contact_phone: activePatient?.emergency_contact_phone || ''
                        });
                        setShowEditModal(true);
                      }} className="text-neutral-400 hover:text-indigo-600 transition-colors" title="Editar Perfil">
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                      <span className="flex items-center gap-1.5"><Phone size={14} /> {activePatient.phone}</span>
                      <span>•</span>
                      <span>ID: {activePatient.id.toString().substring(0,8)}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">LTV: ${activePatient.ltv.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
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
                value={`$${Math.round((activePatient.ltv || 0) / (activePatient.purchase_history?.length || 1)).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`} 
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
                              <p className="text-[10px] text-neutral-500 mt-1 mb-3">{rec.reason}</p>
                              <a 
                                href={`/sales?add_query=${encodeURIComponent(rec.search_query || rec.product_name)}&patient_id=${selectedPatientId}`}
                                className="w-full flex items-center justify-center gap-1 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-900/50"
                              >
                                <ShoppingCart size={12} /> Agregar al POS
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-neutral-500 mb-3">Solicita a la IA que analice el historial de este paciente.</p>
                          <button 
                            onClick={generateAiRecommendations}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Sparkles size={14} /> Generar Recomendaciones
                          </button>
                        </div>
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
                      {activePatient?.preferences?.prescriptions?.length > 0 ? (
                        activePatient.preferences.prescriptions.map((presc: any, i: number) => (
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
                            <td className="px-6 py-4 text-neutral-900 dark:text-white font-medium">${purchase.grand_total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
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
                <div className="flex-1 overflow-y-auto p-4">
                  {waLoading ? (
                    <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : waMessages.length > 0 ? (
                    <div className="space-y-4">
                      {waMessages.map((msg: any) => (
                        <div key={msg.id} className="p-4 bg-white dark:bg-[#111111] rounded-lg border border-neutral-100 dark:border-neutral-800 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{msg.isOutgoing ? 'Enviado' : 'Recibido'} por {msg.sender || 'Sistema'}</span>
                            <span className="text-xs text-neutral-500">{String(msg.timestamp).split(' ')[0]}</span>
                          </div>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: msg.text || ''}}></p>
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
              <form id="edit-patient-form" onSubmit={async (e) => {
                e.preventDefault();
                setIsSaving(true);
                try {
                  const prefs = { ...(activePatient.preferences || {}) };
                  await api.put(`/crm/patients/${activePatient.id}`, {
                    first_name: editFormData.first_name,
                    last_name: editFormData.last_name,
                    phone: editFormData.phone,
                    document_id: editFormData.document_id,
                    email: editFormData.email,
                    address: editFormData.address,
                    eps: editFormData.eps,
                    blood_group: editFormData.blood_group,
                    birth_date: editFormData.birth_date || null,
                    allergies: editFormData.allergies,
                    medical_notes: editFormData.medical_notes,
                    emergency_contact_name: editFormData.emergency_contact_name,
                    emergency_contact_phone: editFormData.emergency_contact_phone,
                    preferences: prefs
                  });
                  await fetchPatients();
                  setShowEditModal(false);
                } catch (err) {
                  alert("Error al actualizar");
                } finally {
                  setIsSaving(false);
                }
              }} className="space-y-6">
                
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Información Personal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Nombre Completo</label>
                      <input type="text" value={editFormData.first_name + " " + editFormData.last_name} onChange={(e) => { const parts = e.target.value.split(" "); setEditFormData({...editFormData, first_name: parts[0] || "", last_name: parts.slice(1).join(" ")}) }} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Cédula / DNI</label>
                      <input type="text" value={editFormData.document_id} onChange={e => setEditFormData({...editFormData, document_id: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Teléfono</label>
                      <input type="tel" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Email</label>
                      <input type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Fecha de Nacimiento</label>
                      <input type="date" value={editFormData.birth_date} onChange={e => setEditFormData({...editFormData, birth_date: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Dirección</label>
                      <input type="text" value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>

                <hr className="border-neutral-200 dark:border-neutral-800" />

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Perfil Clínico</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">EPS / Aseguradora</label>
                      <select value={editFormData.eps} onChange={e => setEditFormData({...editFormData, eps: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500">
                        <option>Sura</option>
                        <option>Coomeva</option>
                        <option>Sanitas</option>
                        <option>Nueva EPS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Grupo Sanguíneo</label>
                      <select value={editFormData.blood_group} onChange={e => setEditFormData({...editFormData, blood_group: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500">
                        <option>O+</option>
                        <option>A-</option>
                        <option>B+</option>
                        <option>AB+</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Alergias Conocidas</label>
                      <input type="text" value={editFormData.allergies} onChange={e => setEditFormData({...editFormData, allergies: e.target.value})} placeholder="Ej: Penicilina, Aspirina (separadas por coma)" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Condiciones Crónicas / Tags Clínicos</label>
                      <input type="text" defaultValue={activePatient.tags.join(", ")} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Notas Médicas</label>
                      <textarea rows={2} value={editFormData.medical_notes} onChange={e => setEditFormData({...editFormData, medical_notes: e.target.value})} placeholder="Observaciones generales..." className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500"></textarea>
                    </div>
                  </div>
                </div>

                <hr className="border-neutral-200 dark:border-neutral-800" />

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Familia y Contacto</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Contacto de Emergencia</label>
                      <input type="text" value={editFormData.emergency_contact_name} onChange={e => setEditFormData({...editFormData, emergency_contact_name: e.target.value})} placeholder="Nombre completo" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Teléfono Emergencia</label>
                      <input type="tel" value={editFormData.emergency_contact_phone} onChange={e => setEditFormData({...editFormData, emergency_contact_phone: e.target.value})} placeholder="+57..." className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />
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
              <button type="button" onClick={async () => {
                if (!confirm('¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer.')) return;
                try {
                  await api.delete(`/crm/patients/${activePatient.id}`);
                  await fetchPatients();
                  setSelectedPatientId('');
                  setShowEditModal(false);
                } catch (err) {
                  alert("Error al eliminar");
                }
              }} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Eliminar Paciente</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-1.5 rounded-md text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800">Cancelar</button>
                <button type="submit" form="edit-patient-form" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors">Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WA Modal */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl w-[500px] shadow-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-bold mb-4 text-neutral-900 dark:text-white">Mensaje WhatsApp a {activePatient?.name}</h3>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Seleccionar Plantilla</label>
              <select 
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500"
                onChange={(e) => {
                  const t = waTemplates.find((x: any) => x.id === e.target.value);
                  setSelectedTemplate(t);
                }}
                value={selectedTemplate?.id || ''}
              >
                <option value="" disabled>Seleccione una plantilla...</option>
                {waTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            {selectedTemplate && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Contenido de la plantilla
                </label>
                <div className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {selectedTemplate.content}
                </div>
              </div>
            )}

            {selectedTemplate?.name?.includes('POS') && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Vincular Venta (Para inyectar el total pagado)
                </label>
                <select 
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500"
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                >
                  <option value="" disabled>Seleccione una venta del paciente...</option>
                  {waRecords.sales?.map((s:any) => (
                    <option key={s.id} value={s.id}>
                      {String(s.created_at).split('T')[0]} - ${Number(s.grand_total).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </option>
                  ))}
                </select>
              </div>
            )}



            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowWaModal(false)} className="px-4 py-2 text-sm font-medium hover:text-neutral-900 transition-colors">Cancelar</button>
              <button 

                onClick={async () => {
                  try {
                    if (!activePatient?.phone) {
                      alert("El paciente no tiene número de teléfono registrado.");
                      return;
                    }
                    setIsSaving(true);
                    let msg = selectedTemplate.content;
                    msg = msg.replace('{{1}}', activePatient.first_name || activePatient.name);
                    
                    if (selectedTemplate.name.includes('POS') && selectedRecordId) {
                      const sale = waRecords.sales?.find((s:any) => s.id === selectedRecordId);
                      if (sale) {
                        msg = msg.replace('{{2}}', `$${Number(sale.grand_total).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`);
                        msg = msg.replace('{{3}}', new Date(sale.created_at).toLocaleDateString('es-CO'));
                        
                        const itemsDetail = sale.items?.map((item: any) => 
                          `🔹 ${item.quantity}x ${item.product?.brand_name || 'Producto'} ($${Number(item.total).toLocaleString('es-CO')})`
                        ).join('\n') || 'Productos no detallados';
                        
                        msg = msg.replace('{{4}}', itemsDetail);
                      }
                    } else {
                      if (msg.includes('{{2}}')) msg = msg.replace('{{2}}', '(Monto)');
                      if (msg.includes('{{3}}')) msg = msg.replace('{{3}}', '(Fecha)');
                      if (msg.includes('{{4}}')) msg = msg.replace('{{4}}', '(Detalle de compra)');
                    }
                    
                    const res = await fetch('http://localhost:3001/api/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ phone: activePatient.phone, message: msg })
                    });
                    
                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      throw new Error(errorData.error || `Error HTTP: ${res.status}`);
                    }
                    
                    setShowWaModal(false);
                    alert("Mensaje enviado por WhatsApp de forma local.");
                  } catch (e: any) {
                    alert("Fallo al enviar: " + (e.message || "Asegúrate de que el microservicio está corriendo."));
                  } finally {
                    setIsSaving(false);
                  }
                }} 
                disabled={isSaving || !selectedTemplate}
                className="px-6 py-2 bg-[#25D366] hover:bg-[#20b858] disabled:opacity-50 text-white rounded-md text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                {isSaving ? 'Enviando...' : 'Enviar por WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Añadir Paciente</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
            </div>
            <div className="p-6">
              <form id="add-patient-form" onSubmit={async (e) => {
                e.preventDefault();
                setIsSaving(true);
                try {
                  const prefs = { email: addFormData.email, address: addFormData.address, eps: addFormData.eps, blood_type: addFormData.blood_type };
                  const res = await api.post('/crm/patients', {
                    first_name: addFormData.first_name,
                    last_name: addFormData.last_name,
                    phone: addFormData.phone,
                    document_id: addFormData.document_id,
                    preferences: prefs
                  });
                  await fetchPatients();
                  setShowAddModal(false);
                  setSelectedPatientId(res.data.id);
                  setAddFormData({ first_name: '', last_name: '', phone: '', document_id: '', email: '', address: '', eps: '', blood_type: '' });
                } catch(err) {
                  alert('Error al crear');
                } finally {
                  setIsSaving(false);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Nombres</label>
                    <input type="text" value={addFormData.first_name} onChange={e => setAddFormData({...addFormData, first_name: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Apellidos</label>
                    <input type="text" value={addFormData.last_name} onChange={e => setAddFormData({...addFormData, last_name: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Teléfono</label>
                  <input type="tel" value={addFormData.phone} onChange={e => setAddFormData({...addFormData, phone: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Cédula</label>
                  <input type="text" value={addFormData.document_id} onChange={e => setAddFormData({...addFormData, document_id: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md" />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium hover:text-neutral-900 transition-colors">Cancelar</button>
                <button form="add-patient-form" type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm font-medium">{isSaving ? 'Guardando...' : 'Guardar Paciente'}</button>
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
