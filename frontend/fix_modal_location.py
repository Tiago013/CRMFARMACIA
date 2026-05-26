import sys

file_path = r"c:\Users\santi\Downloads\CRMFARMAIA\frontend\src\app\(dashboard)\crm\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract the modal text
modal_start = """      {showAddModal && ("""
modal_end = """        </div>\n      )}\n    </div>\n  );\n};"""
modal_str = content[content.find(modal_start):content.find(modal_end)+len(modal_end)]

# 2. Delete it from CircularScore
# The correct end of CircularScore should be just `    </div>\n  );\n};`
content = content.replace(modal_str, "    </div>\n  );\n};")

# 3. Add it to the bottom of the CRMPage component
# Search for the end of CRMPage
crm_page_end = """        </div>\n      )}\n    </div>\n  );\n}"""
# Wait, let's see what the end of CRMPage looks like.
# I'll just append it right before the last `    </div>\n  );\n}` that ends the CRMPage.

# Actually, the python script logic before replaced "    </div>\n  );\n}"
# We can find the end of CRMPage by looking for the last "    </div>\n  );\n}" before "function tabTitle"

modal_code_to_insert = """      {showAddModal && (
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
}"""

content = content.replace("    </div>\n  );\n}\n\nfunction tabTitle(id: string)", modal_code_to_insert + "\n\nfunction tabTitle(id: string)")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed modal location.")
