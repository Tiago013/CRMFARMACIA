'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, Calendar, HeartPulse, ShoppingCart, Send, Sparkles, TrendingDown, TrendingUp, AlertTriangle, MessageCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiClient as api } from '@/lib/axios';

// Mocks simulando la base de datos
const INITIAL_PATIENTS = [
  { id: 1, name: 'María Elena Salazar', phone: '+57 300 123 4567', lastVisit: 'Hace 2 días', tags: ['Hipertensión', 'Cliente Frecuente'], ltv: 450.50, initials: 'ME' },
  { id: 2, name: 'Carlos Roberto Gómez', phone: '+57 310 987 6543', lastVisit: 'Hace 1 mes', tags: ['Diabético'], ltv: 120.00, initials: 'CG' },
  { id: 3, name: 'Ana Lucía Pérez', phone: '+57 315 456 7890', lastVisit: 'Hoy', tags: ['Dermatología'], ltv: 85.20, initials: 'AP' },
];

const INITIAL_TIMELINE = {
  1: [
    { id: 101, type: 'sale', title: 'Compra Realizada', date: new Date(Date.now() - 2 * 86400000), desc: 'Compró Losartán 50mg (x2). Total: $37.00' },
    { id: 102, type: 'note', title: 'Nota Médica', date: new Date(Date.now() - 15 * 86400000), desc: 'El paciente reportó alergia a la penicilina.' }
  ],
  2: [
    { id: 103, type: 'sale', title: 'Compra Realizada', date: new Date(Date.now() - 30 * 86400000), desc: 'Compró Insulina (x1). Total: $45.00' }
  ],
  3: []
};

export default function CRMPage() {
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [aiContext, setAiContext] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  const [timelines, setTimelines] = useState(INITIAL_TIMELINE);
  const [newNote, setNewNote] = useState('');

  // Derived state
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone.includes(searchQuery)
  );
  
  const activePatient = patients.find(p => p.id === selectedPatientId);
  const activeTimeline = timelines[selectedPatientId as keyof typeof timelines] || [];

  useEffect(() => {
    if (!selectedPatientId) return;
    const fetchAiContext = async () => {
      setLoadingAi(true);
      try {
        const res = await api.get(`/ai/patient/${selectedPatientId}`);
        setAiContext(res.data);
      } catch (e) {
        console.error("AI Error:", e);
        setAiContext(null);
      } finally {
        setLoadingAi(false);
      }
    };
    fetchAiContext();
  }, [selectedPatientId]);

  const handleAddNote = () => {
    if (!newNote.trim() || !activePatient) return;
    
    const newEvent = {
      id: Date.now(),
      type: 'note',
      title: 'Nota Manual',
      date: new Date(),
      desc: newNote
    };
    
    setTimelines(prev => ({
      ...prev,
      [activePatient.id]: [newEvent, ...(prev[activePatient.id as keyof typeof prev] || [])]
    }));
    setNewNote('');
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [sendingWa, setSendingWa] = useState(false);

  // Mock chat history
  const [chatHistory, setChatHistory] = useState([
    { id: 1, text: 'Hola, recuerde que su Losartán está por terminarse.', sender: 'bot', time: '10:00 AM' },
    { id: 2, text: 'Muchas gracias, iré por él esta tarde.', sender: 'user', time: '10:15 AM' }
  ]);

  const handleSendWa = async () => {
    if (!waMessage.trim()) return;
    setSendingWa(true);
    try {
      await api.post('/communications/whatsapp/send', {
        patient_id: activePatient?.id.toString(),
        phone_number: activePatient?.phone,
        message_text: waMessage
      });
      setChatHistory([...chatHistory, { id: Date.now(), text: waMessage, sender: 'bot', time: format(new Date(), 'h:mm a') }]);
      setWaMessage('');
    } catch (e) {
      console.error(e);
    } finally {
      setSendingWa(false);
    }
  };
  
  const [newPatientData, setNewPatientData] = useState({ name: '', phone: '', tags: '' });

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientData.name || !newPatientData.phone) return;
    
    const newPatient = {
      id: Date.now(),
      name: newPatientData.name,
      phone: newPatientData.phone,
      lastVisit: 'Nunca',
      tags: newPatientData.tags.split(',').map(t => t.trim()).filter(Boolean),
      ltv: 0,
      initials: newPatientData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    };
    
    setPatients(prev => [newPatient, ...prev]);
    setShowAddModal(false);
    setNewPatientData({ name: '', phone: '', tags: '' });
    setSelectedPatientId(newPatient.id);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000000]">
      {/* Header Premium (Linear Style) */}
      <div className="flex justify-between items-center px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            Directorio de Pacientes
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">Centraliza la información clínica y operativa.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm"
        >
          <Plus size={14} />
          <span>Añadir Paciente</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        
        {/* Left Side: Patient List */}
        <div className="w-full md:w-[320px] flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#050505] shrink-0">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="relative group flex items-center">
              <Search className="absolute left-2.5 text-neutral-400" size={14} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar paciente..." 
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm focus:border-neutral-400 dark:focus:border-neutral-500 outline-none transition-colors placeholder:text-neutral-400"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filteredPatients.map((p) => {
                const isActive = p.id === selectedPatientId;
                return (
                  <li 
                    key={p.id} 
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-4 cursor-pointer transition-colors ${isActive ? 'bg-neutral-100/80 dark:bg-neutral-800/40' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/30'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`text-sm font-medium ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>{p.name}</h3>
                        <div className="flex items-center text-xs text-neutral-500 mt-0.5">
                          {p.phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {p.tags.map(tag => (
                        <span key={tag} className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded font-medium border ${isActive ? 'bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200' : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
              {filteredPatients.length === 0 && (
                <div className="p-8 text-center text-sm text-neutral-500">No se encontraron pacientes.</div>
              )}
            </ul>
          </div>
        </div>

        {/* Right Side: Patient Detail */}
        {activePatient ? (
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#000000]">
            
            {/* Detail Header */}
            <div className="p-8 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full flex items-center justify-center text-neutral-900 dark:text-white text-xl font-medium">
                  {activePatient.initials}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">{activePatient.name}</h2>
                  <div className="flex items-center space-x-4 mt-1.5 text-xs text-neutral-500">
                    <span className="flex items-center"><Phone size={12} className="mr-1.5"/> {activePatient.phone}</span>
                    <span className="text-neutral-300 dark:text-neutral-700">•</span>
                    <span className="flex items-center font-medium">LTV: ${activePatient.ltv.toFixed(2)}</span>
                    {aiContext && (
                      <>
                        <span className="text-neutral-300 dark:text-neutral-700">•</span>
                        <span className={`flex items-center font-medium ${aiContext.churn_risk_score > 0.5 ? 'text-red-500' : 'text-emerald-500'}`}>
                           Riesgo Churn: {(aiContext.churn_risk_score * 100).toFixed(0)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowWaModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#128C7E] dark:bg-[#25D366]/10 dark:text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20 rounded-md text-xs font-medium transition-colors shadow-sm"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </button>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-md text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors shadow-sm"
                >
                  Editar Perfil
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col xl:flex-row gap-8">
              
              {/* Timeline (Left Column) */}
              <div className="flex-1 max-w-2xl">
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-white mb-6 flex items-center">
                  Historial de Actividad
                </h3>
                
                {activeTimeline.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3.5 before:-translate-x-px md:before:translate-x-0 before:h-full before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
                    
                    {activeTimeline.map((event) => (
                      <div key={event.id} className="relative flex items-start gap-4">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-800 shrink-0 shadow-sm relative z-10 bg-white dark:bg-[#0A0A0A] ${event.type === 'sale' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                          {event.type === 'sale' ? <ShoppingCart size={12} /> : <Calendar size={12} />}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-neutral-900 dark:text-white text-sm">{event.title}</h4>
                            <time className="text-xs text-neutral-500">
                              {format(event.date, "d MMM, yyyy", { locale: es })}
                            </time>
                          </div>
                          <p className="text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed">{event.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-md border border-dashed border-neutral-200 dark:border-neutral-800 text-sm text-neutral-500">
                    No hay actividad registrada.
                  </div>
                )}
              </div>

              {/* Input Note Widget */}
              <div className="mt-10 max-w-2xl bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-md p-1 shadow-sm flex items-end gap-2 focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition-colors">
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm text-neutral-900 dark:text-white p-2.5 outline-none" 
                  rows={1}
                  placeholder="Escribir nota..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                ></textarea>
                <button 
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="mb-1 mr-1 bg-neutral-900 dark:bg-white disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 text-white dark:text-black p-1.5 rounded text-xs font-medium transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
              </div>

              {/* AI Insights (Right Column) */}
              <div className="w-full xl:w-80 shrink-0 space-y-6">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={16} />
                  <h3 className="text-sm font-semibold">FarmaAI Insights</h3>
                </div>

                {loadingAi ? (
                  <div className="text-xs text-neutral-500 animate-pulse">Analizando perfil...</div>
                ) : aiContext ? (
                  <div className="space-y-6">
                    {/* Insights */}
                    {aiContext.insights.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Alertas y Sugerencias</h4>
                        {aiContext.insights.map((insight: any, idx: number) => (
                          <div key={idx} className={`p-3 rounded-md border text-xs ${insight.priority === 'high' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'}`}>
                            <div className="font-semibold mb-1 flex items-center gap-1.5">
                              {insight.priority === 'high' ? <AlertTriangle size={12}/> : <TrendingUp size={12}/>}
                              {insight.insight_type === 'refill_reminder' ? 'Recordatorio Refill' : 'Oportunidad'}
                            </div>
                            <p className="opacity-90">{insight.description}</p>
                            <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 font-medium">
                              Acción: {insight.actionable_step}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommendations */}
                    {aiContext.recommendations.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Cross-Sell Recomendado</h4>
                        {aiContext.recommendations.map((rec: any, idx: number) => (
                          <div key={idx} className="p-3 bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-md">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-neutral-900 dark:text-white text-sm">{rec.product_name}</span>
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold">
                                {(rec.confidence_score * 100).toFixed(0)}% Match
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1.5">{rec.reason}</p>
                            <button className="mt-3 w-full py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-medium rounded transition-colors">
                              Añadir al Carrito
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500">No hay insights disponibles.</div>
                )}
              </div>

            </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#000000]">
            <p className="text-neutral-400 text-sm">Selecciona un paciente</p>
          </div>
        )}
      </div>

      {/* MODAL: Añadir Paciente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Nuevo Paciente</h3>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
            </div>
            <form onSubmit={handleAddPatient} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Nombre Completo</label>
                <input required type="text" value={newPatientData.name} onChange={e => setNewPatientData({...newPatientData, name: e.target.value})} className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-neutral-500 outline-none" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Teléfono</label>
                <input required type="tel" value={newPatientData.phone} onChange={e => setNewPatientData({...newPatientData, phone: e.target.value})} className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-neutral-500 outline-none" placeholder="+57 300..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Etiquetas Médicas (separadas por coma)</label>
                <input type="text" value={newPatientData.tags} onChange={e => setNewPatientData({...newPatientData, tags: e.target.value})} className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-neutral-500 outline-none" placeholder="Diabético, Hipertenso" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded-md text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-md text-xs font-medium shadow-sm">Guardar Paciente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Perfil */}
      {showEditModal && activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Editar Perfil</h3>
              <button onClick={() => setShowEditModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowEditModal(false); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Nombre Completo</label>
                <input type="text" defaultValue={activePatient.name} className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm focus:border-neutral-500 outline-none" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-3 py-1.5 rounded-md text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-md text-xs font-medium shadow-sm">Actualizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WhatsApp Chat */}
      {showWaModal && activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#EFEAE2] dark:bg-[#0B141A] rounded-lg shadow-2xl border border-neutral-300 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 h-[500px]">
            {/* WA Header */}
            <div className="p-3 bg-[#00A884] dark:bg-[#202C33] flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium">
                  {activePatient.initials}
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight">{activePatient.name}</h3>
                  <p className="text-[10px] opacity-80">{activePatient.phone}</p>
                </div>
              </div>
              <button onClick={() => setShowWaModal(false)} className="text-white/80 hover:text-white">&times;</button>
            </div>
            
            {/* WA Body (Messages) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center dark:bg-blend-multiply dark:bg-[#0B141A]">
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-2 text-sm shadow-sm relative ${msg.sender === 'bot' ? 'bg-[#D9FDD3] dark:bg-[#005C4B] text-neutral-900 dark:text-white rounded-tr-none' : 'bg-white dark:bg-[#202C33] text-neutral-900 dark:text-white rounded-tl-none'}`}>
                    <p className="pr-10">{msg.text}</p>
                    <span className="text-[9px] text-neutral-500 dark:text-neutral-400 absolute bottom-1 right-2">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* WA Input */}
            <div className="p-3 bg-[#F0F2F5] dark:bg-[#202C33] flex items-end gap-2">
              <textarea 
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                className="flex-1 bg-white dark:bg-[#2A3942] border-none rounded-lg resize-none text-sm text-neutral-900 dark:text-white p-2.5 outline-none shadow-sm focus:ring-1 focus:ring-[#00A884]" 
                rows={1}
                placeholder="Escribe un mensaje..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendWa();
                  }
                }}
              ></textarea>
              <button 
                onClick={handleSendWa}
                disabled={!waMessage.trim() || sendingWa}
                className="mb-0.5 bg-[#00A884] disabled:bg-neutral-400 text-white p-2.5 rounded-full text-xs font-medium transition-colors shadow-sm flex items-center justify-center shrink-0"
              >
                <Send size={16} className={sendingWa ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
