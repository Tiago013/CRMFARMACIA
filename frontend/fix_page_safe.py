import sys
import re

file_path = r"c:\Users\santi\Downloads\CRMFARMAIA\frontend\src\app\(dashboard)\crm\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State Variables
old_state = "  const [showEditModal, setShowEditModal] = useState(false);\n  const [newPatientData, setNewPatientData] = useState({ name: '', phone: '', tags: '' });"
new_state = """  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ first_name: '', last_name: '', phone: '', document_id: '', email: '', address: '', eps: '', blood_type: '' });
  const [addFormData, setAddFormData] = useState({ first_name: '', last_name: '', phone: '', document_id: '', email: '', address: '', eps: '', blood_type: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [waMessages, setWaMessages] = useState<any[]>([]);
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [waRecords, setWaRecords] = useState<any>({sales: [], invoices: []});
  const [waLoading, setWaLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | ''>('');"""
content = content.replace(old_state, new_state)

# 2. Extract fetchPatients out of useEffect
old_fetch = """  // Fetch Patients
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
  }, [searchQuery]);"""

new_fetch = """  // Fetch Patients
  const fetchPatients = async (query: string = searchQuery) => {
    try {
      const res = await api.get('/crm/patients', { params: { limit: 50, search: query } });
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped = data.map((p: any) => ({
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
  }, [searchQuery]);"""
content = content.replace(old_fetch, new_fetch)

# 3. Fix fetchPatientProfile
old_profile = """              ...p,
              score: res.data.score || 50,
              purchase_history: res.data.purchase_history || [],
              timeline: res.data.timeline || [],
              chart_data: res.data.chart_data || [],
              ltv: res.data.ltv || p.ltv"""

new_profile = """              ...p,
              first_name: res.data.first_name || p.first_name,
              last_name: res.data.last_name || p.last_name,
              document_id: res.data.document_id || p.document_id,
              phone: res.data.phone || p.phone,
              preferences: res.data.preferences || p.preferences,
              score: res.data.score || 50,
              purchase_history: res.data.purchase_history || [],
              timeline: res.data.timeline || [],
              chart_data: res.data.chart_data || [],
              ltv: res.data.ltv || p.ltv"""
content = content.replace(old_profile, new_profile)

# 4. Open Edit Modal (onClick with Form Fill)
old_open_edit = """<button onClick={() => setShowEditModal(true)} className="text-neutral-400 hover:text-indigo-600 transition-colors" title="Editar Perfil">"""
new_open_edit = """<button onClick={() => {
                        setEditFormData({
                          first_name: activePatient?.first_name || '',
                          last_name: activePatient?.last_name || '',
                          phone: activePatient?.phone || '',
                          document_id: activePatient?.document_id || '',
                          email: activePatient?.preferences?.email || '',
                          address: activePatient?.preferences?.address || '',
                          eps: activePatient?.preferences?.eps || 'Sura',
                          blood_type: activePatient?.preferences?.blood_type || 'O+'
                        });
                        setShowEditModal(true);
                      }} className="text-neutral-400 hover:text-indigo-600 transition-colors" title="Editar Perfil">"""
content = content.replace(old_open_edit, new_open_edit)

# 5. Edit Modal onSubmit and Save
old_edit_form_start = """<form id="edit-patient-form" onSubmit={(e) => { e.preventDefault(); setShowEditModal(false); }} className="space-y-6">"""
new_edit_form_start = """<form id="edit-patient-form" onSubmit={async (e) => {
                e.preventDefault();
                setIsSaving(true);
                try {
                  const prefs = { ...(activePatient.preferences || {}), email: editFormData.email, address: editFormData.address, eps: editFormData.eps, blood_type: editFormData.blood_type };
                  await api.put(`/crm/patients/${activePatient.id}`, {
                    first_name: editFormData.first_name,
                    last_name: editFormData.last_name,
                    phone: editFormData.phone,
                    document_id: editFormData.document_id,
                    preferences: prefs
                  });
                  await fetchPatients();
                  setShowEditModal(false);
                } catch (err) {
                  alert("Error al actualizar");
                } finally {
                  setIsSaving(false);
                }
              }} className="space-y-6">"""
content = content.replace(old_edit_form_start, new_edit_form_start)

# Edit form inputs replacement
content = content.replace("""<input type="text" defaultValue={activePatient.name} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />""",
                          """<input type="text" value={editFormData.first_name + " " + editFormData.last_name} onChange={(e) => { const parts = e.target.value.split(" "); setEditFormData({...editFormData, first_name: parts[0] || "", last_name: parts.slice(1).join(" ")}) }} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" required />""")

content = content.replace("""<input type="text" placeholder="CC 1.023.456.789" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />""",
                          """<input type="text" value={editFormData.document_id} onChange={e => setEditFormData({...editFormData, document_id: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />""")

content = content.replace("""<input type="tel" defaultValue={activePatient.phone} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />""",
                          """<input type="tel" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" required />""")

content = content.replace("""<input type="email" placeholder="correo@ejemplo.com" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />""",
                          """<input type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />""")

content = content.replace("""<input type="text" placeholder="Cra 45 #12-34" className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />""",
                          """<input type="text" value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500" />""")

content = content.replace("""<select className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500">
                        <option>Sura</option>
                        <option>Coomeva</option>
                        <option>Sanitas</option>
                        <option>Nueva EPS</option>
                      </select>""",
                          """<select value={editFormData.eps} onChange={e => setEditFormData({...editFormData, eps: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500">
                        <option>Sura</option>
                        <option>Coomeva</option>
                        <option>Sanitas</option>
                        <option>Nueva EPS</option>
                      </select>""")

content = content.replace("""<select className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500">
                        <option>O+</option>
                        <option>A-</option>
                        <option>B+</option>
                        <option>AB+</option>
                      </select>""",
                          """<select value={editFormData.blood_type} onChange={e => setEditFormData({...editFormData, blood_type: e.target.value})} className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500">
                        <option>O+</option>
                        <option>A-</option>
                        <option>B+</option>
                        <option>AB+</option>
                      </select>""")

# 6. Delete Logic in Edit Modal Buttons
old_edit_buttons = """            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0A0A0A] flex justify-between items-center shrink-0">
              <button className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors">Eliminar Paciente</button>
              <div className="flex gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Cancelar</button>
                <button form="edit-patient-form" type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm">Guardar Cambios</button>
              </div>
            </div>"""

new_edit_buttons = """            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0A0A0A] flex justify-between items-center shrink-0">
              <button 
                disabled={isSaving}
                onClick={async () => {
                  if(!confirm('¿Eliminar paciente localmente y archivar en Odoo?')) return;
                  setIsSaving(true);
                  try {
                    await api.delete(`/crm/patients/${activePatient.id}`);
                    setSelectedPatientId(null);
                    await fetchPatients();
                    setShowEditModal(false);
                  } catch(e) {
                    alert('Error eliminando paciente');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors">Eliminar Paciente</button>
              <div className="flex gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Cancelar</button>
                <button form="edit-patient-form" type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors shadow-sm">{isSaving ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </div>"""
content = content.replace(old_edit_buttons, new_edit_buttons)

# 7. Add WA UseEffects Safely
hooks_inject = """
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

  // Fetch WhatsApp Templates and Records when Modal opens
  useEffect(() => {
    if (showWaModal && selectedPatientId) {
      const fetchWAData = async () => {
        try {
          const [tempRes, recRes] = await Promise.all([
            api.get('/communications/whatsapp/templates'),
            api.get(`/communications/whatsapp/${selectedPatientId}/records`)
          ]);
          setWaTemplates(tempRes.data || []);
          setWaRecords(recRes.data || {sales: [], invoices: []});
        } catch(e) { console.error(e); }
      };
      fetchWAData();
    }
  }, [showWaModal, selectedPatientId]);

  return (
    <div className="flex flex-col h-full bg-[#FBFBFB] dark:bg-[#0A0A0A]">"""

content = content.replace('  return (\n    <div className="flex flex-col h-full bg-[#FBFBFB] dark:bg-[#0A0A0A]">', hooks_inject)

# 8. Add WA Modal & Add Patient Modal
add_modal_jsx = """      {/* WA Modal */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl w-[500px] shadow-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-bold mb-4 text-neutral-900 dark:text-white">Mensaje WhatsApp a {activePatient?.name}</h3>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Seleccionar Plantilla</label>
              <select 
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500"
                onChange={(e) => {
                  const t = waTemplates.find(x => x.id === parseInt(e.target.value));
                  setSelectedTemplate(t);
                  setSelectedRecordId('');
                }}
                value={selectedTemplate?.id || ''}
              >
                <option value="" disabled>Seleccione una plantilla...</option>
                {waTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.model_id[1]})</option>
                ))}
              </select>
            </div>
            
            {selectedTemplate && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Seleccionar {selectedTemplate.model_id[1]}
                </label>
                <select 
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500"
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value ? parseInt(e.target.value) : '')}
                >
                  <option value="" disabled>Seleccione un registro...</option>
                  {selectedTemplate.model_id[1] === 'Sale Order' ? waRecords.sales.map((s:any) => (
                    <option key={s.id} value={s.id}>{s.name} - {String(s.date_order).split(' ')[0]} - ${s.amount_total}</option>
                  )) : waRecords.invoices.map((i:any) => (
                    <option key={i.id} value={i.id}>{i.name} - {String(i.invoice_date).split(' ')[0]} - ${i.amount_total}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowWaModal(false)} className="px-4 py-2 text-sm font-medium hover:text-neutral-900 transition-colors">Cancelar</button>
              <button 
                onClick={async () => {
                  try {
                    setIsSaving(true);
                    await api.post(`/communications/whatsapp/${activePatient.id}/send-template`, {
                      template_id: selectedTemplate.id,
                      res_model: selectedTemplate.model_id[1] === 'Sale Order' ? 'sale.order' : 'account.move',
                      res_id: selectedRecordId
                    });
                    setShowWaModal(false);
                    // Refresh history if activeTab is comunicacion
                    if (activeTab === 'comunicacion') {
                        const res = await api.get(`/communications/whatsapp/${activePatient.id}/messages`);
                        setWaMessages(res.data || []);
                    }
                    alert("Mensaje enviado por WhatsApp a través de Odoo.");
                  } catch (e) {
                    alert("Error enviando WhatsApp vía Odoo");
                  } finally {
                    setIsSaving(false);
                  }
                }} 
                disabled={isSaving || !selectedTemplate || !selectedRecordId}
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
"""

old_modals = """      {/* WA Modal Mock */}
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
      )}"""

content = content.replace(old_modals, add_modal_jsx)

# 9. Map the WA history
old_history = """              <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
                <MessageSquare className="w-8 h-8 mb-3 opacity-20" />
                <p>No hay mensajes recientes por WhatsApp con este paciente.</p>
              </div>"""

new_history = """              {waLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
              ) : waMessages.length > 0 ? (
                <div className="space-y-4">
                  {waMessages.map((msg: any) => (
                    <div key={msg.id} className="p-4 bg-white dark:bg-[#111111] rounded-lg border border-neutral-100 dark:border-neutral-800">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{msg.state}</span>
                        <span className="text-xs text-neutral-500">{msg.date}</span>
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
                  <MessageSquare className="w-8 h-8 mb-3 opacity-20" />
                  <p>No hay mensajes recientes por WhatsApp con este paciente.</p>
                </div>
              )}"""

content = content.replace(old_history, new_history)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Safely replaced everything!")
