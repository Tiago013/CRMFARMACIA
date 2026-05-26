import sys

file_path = r"c:\Users\santi\Downloads\CRMFARMAIA\frontend\src\app\(dashboard)\crm\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state variables for WhatsApp
states_inject = """  const [isSaving, setIsSaving] = useState(false);
  const [waMessages, setWaMessages] = useState<any[]>([]);
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [waRecords, setWaRecords] = useState<any>({sales: [], invoices: []});
  const [waLoading, setWaLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | ''>('');"""

content = content.replace("  const [isSaving, setIsSaving] = useState(false);", states_inject)

# 2. Add useEffect hooks before return (
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

  return ("""

content = content.replace("  return (", hooks_inject)

# 3. Replace the showWaModal with the correct dynamic templates one
old_modal_str = """      {/* WA Modal */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl w-[500px] shadow-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-bold mb-4 text-neutral-900 dark:text-white">Mensaje WhatsApp a {activePatient?.name}</h3>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Seleccionar Plantilla</label>
              <select 
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'bienvenida') {
                    setWaMessage(`Hola ${activePatient?.first_name || activePatient?.name}, ¡Bienvenido a FarmaIA! Estamos aquí para ayudarte con tu salud.`);
                  } else if (val === 'recordatorio') {
                    setWaMessage(`Hola ${activePatient?.first_name || activePatient?.name}, te recordamos que es momento de adquirir tus medicamentos para mantener tu adherencia al tratamiento.`);
                  } else if (val === 'promocion') {
                    setWaMessage(`Hola ${activePatient?.first_name || activePatient?.name}, tenemos un descuento especial en tus productos frecuentes.`);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Seleccione una plantilla...</option>
                <option value="bienvenida">Mensaje de Bienvenida</option>
                <option value="recordatorio">Recordatorio de Adherencia</option>
                <option value="promocion">Promoción Especial</option>
              </select>
            </div>

            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Mensaje</label>
            <textarea 
              className="w-full border border-neutral-200 dark:border-neutral-800 rounded-md p-3 text-sm mb-4 bg-neutral-50 dark:bg-[#111111] outline-none focus:border-[#25D366]" 
              rows={4} 
              placeholder="Escribe el mensaje..."
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
            ></textarea>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowWaModal(false)} className="px-4 py-2 text-sm font-medium hover:text-neutral-900 transition-colors">Cancelar</button>
              <button 
                onClick={async () => {
                  try {
                    setIsSaving(true);
                    await api.post(`/integrations/whatsapp/send`, {
                      phone: activePatient?.phone,
                      message: waMessage,
                      patient_id: activePatient?.id
                    });
                    setWaMessage("");
                    setShowWaModal(false);
                    alert("Mensaje enviado por WhatsApp.");
                  } catch (e) {
                    alert("Error enviando WhatsApp vía Odoo");
                  } finally {
                    setIsSaving(false);
                  }
                }} 
                disabled={isSaving || !waMessage.trim()}
                className="px-6 py-2 bg-[#25D366] hover:bg-[#20b858] disabled:opacity-50 text-white rounded-md text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                {isSaving ? 'Enviando...' : 'Enviar por WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}"""

new_modal_str = """      {/* WA Modal */}
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
      )}"""

content = content.replace(old_modal_str, new_modal_str)

# 4. Map the WA history
# The UI has `<p>No hay mensajes recientes por WhatsApp con este paciente.</p>`
# We need to replace it with actual mapping. Let's find it.
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

print("WhatsApp integration successfully restored.")
