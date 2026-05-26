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
  const [isSaving, setIsSaving] = useState(false);"""
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

# 7. Add Modal JSX (Inject right before the final component closing tag but after WaModal)
# We can find `function tabTitle(id: string) {` and put it right before.
# Let's find the `    </div>\n  );\n}\n\nfunction tabTitle`
add_modal_jsx = """
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
content = content.replace("    </div>\n  );\n}\n\nfunction tabTitle", add_modal_jsx + "    </div>\n  );\n}\n\nfunction tabTitle")

# 8. Date fixes
content = content.replace('format(new Date(s.date_order), "d MMM")', "String(s.date_order).split(' ')[0]")
content = content.replace('format(new Date(i.invoice_date), "d MMM")', "String(i.invoice_date).split(' ')[0]")
content = content.replace('onChange={(e) => setSelectedRecordId(parseInt(e.target.value))}', "onChange={(e) => setSelectedRecordId(e.target.value ? parseInt(e.target.value) : '')}")


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Page updated completely and safely.")
