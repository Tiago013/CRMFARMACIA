'use client';

import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';
import { PatientList } from './_components/PatientList';
import { PatientHeader } from './_components/PatientHeader';
import { GeneralTab } from './_components/GeneralTab';
import { CommunicationTab, PrescriptionsTab, PurchasesTab, TimelineTab } from './_components/HistoryTabs';
import { EditPatientModal } from './_components/EditPatientModal';
import { AddPatientModal } from './_components/AddPatientModal';
import { WhatsAppModal } from './_components/WhatsAppModal';
import { useAiRecommendations } from './_components/useAiRecommendations';

const TABS = [
  { id: 'general', label: 'Vista General' },
  { id: 'compras', label: 'Compras' },
  { id: 'prescripciones', label: 'Prescripciones' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'comunicacion', label: 'Comunicación' },
];

// Normaliza un paciente de la lista; la ficha completa se carga al seleccionarlo
function toListPatient(p: any) {
  return {
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
    score: null,
    purchase_history: [],
    timeline: [],
    chart_data: []
  };
}

export default function CRMPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [waMessages, setWaMessages] = useState<any[]>([]);
  const [waLoading, setWaLoading] = useState(false);

  const ai = useAiRecommendations();

  const fetchPatients = async (query: string = searchQuery) => {
    try {
      const res = await fetch(`/api/crm/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      const mapped = (Array.isArray(data) ? data : []).map(toListPatient);
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

  // Ficha 360°: score, historial, timeline y gasto mensual
  useEffect(() => {
    if (!selectedPatientId) return;
    const fetchPatientProfile = async () => {
      try {
        const res = await fetch(`/api/crm/patients/${selectedPatientId}`);
        const data = await res.json();
        setPatients(prev => prev.map(p => p.id !== selectedPatientId ? p : {
          ...p,
          first_name: data.first_name || p.first_name,
          last_name: data.last_name || p.last_name,
          document_id: data.document_id || p.document_id,
          phone: data.phone || p.phone,
          preferences: data.preferences || p.preferences,
          score: data.score ?? null,
          avg_interval_days: data.avg_interval_days ?? null,
          days_since_last: data.days_since_last ?? null,
          visits: data.visits,
          sales_count: data.sales_count ?? 0,
          purchase_history: data.purchase_history || [],
          timeline: data.timeline || [],
          chart_data: data.chart_data || [],
          ltv: data.ltv || p.ltv
        }));
      } catch (e) {
        console.error('Error fetching patient profile', e);
      }
    };
    fetchPatientProfile();

    ai.reset();
    setActiveTab('general'); // Reset tab on patient change
  }, [selectedPatientId]);

  // Fetch WhatsApp Messages when Communication tab is active
  useEffect(() => {
    if (activeTab === 'comunicacion' && selectedPatientId) {
      const fetchMessages = async () => {
        setWaLoading(true);
        try {
          const res = await api.get(`/communications/whatsapp/${selectedPatientId}/messages`);
          setWaMessages(res.data || []);
        } catch (e) { console.error(e); }
        finally { setWaLoading(false); }
      };
      fetchMessages();
    }
  }, [activeTab, selectedPatientId]);

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
        <PatientList
          patients={patients}
          selectedId={selectedPatientId}
          onSelect={setSelectedPatientId}
          search={searchQuery}
          onSearch={setSearchQuery}
        />

        {/* Right Side (360 View) */}
        {activePatient ? (
          <div className="flex-1 flex flex-col min-w-0 bg-[#FBFBFB] dark:bg-[#000000] overflow-y-auto">
            <PatientHeader patient={activePatient} onEdit={() => setShowEditModal(true)} onMessage={() => setShowWaModal(true)} />

            {/* Tabs */}
            <div className="px-8 border-b border-neutral-200 dark:border-neutral-800 flex gap-6">
              {TABS.map(tab => (
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
                <GeneralTab
                  patient={activePatient}
                  aiContext={ai.aiContext}
                  loadingAi={ai.loadingAi}
                  onGenerateAi={() => ai.generate(selectedPatientId)}
                />
              )}
              {activeTab === 'timeline' && <TimelineTab events={activePatient.timeline || []} />}
              {activeTab === 'prescripciones' && <PrescriptionsTab prescriptions={activePatient.preferences?.prescriptions} />}
              {activeTab === 'compras' && <PurchasesTab purchases={activePatient.purchase_history} />}
              {activeTab === 'comunicacion' && <CommunicationTab messages={waMessages} loading={waLoading} />}
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

      {showEditModal && activePatient && (
        <EditPatientModal
          patient={activePatient}
          onClose={() => setShowEditModal(false)}
          onSaved={() => fetchPatients()}
          onDeleted={async () => { await fetchPatients(); setSelectedPatientId(''); }}
        />
      )}

      {showWaModal && activePatient && (
        <WhatsAppModal patient={activePatient} onClose={() => setShowWaModal(false)} />
      )}

      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onCreated={async (id) => { await fetchPatients(); setSelectedPatientId(id); }}
        />
      )}
    </div>
  );
}
