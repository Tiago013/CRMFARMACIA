import { useState } from 'react';
import { apiClient as api } from '@/lib/axios';

const EMPTY = { first_name: '', last_name: '', phone: '', document_id: '' };
const field = 'w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md';

export function AddPatientModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (patientId: string) => Promise<unknown>;
}) {
  const [form, setForm] = useState(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post('/crm/patients', { ...form, preferences: {} });
      await onCreated(res.data.id);
      onClose();
    } catch {
      alert('Error al crear');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Añadir Paciente</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
        </div>
        <div className="p-6">
          <form id="add-patient-form" onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Nombres</label>
                <input type="text" value={form.first_name} onChange={set('first_name')} className={field} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Apellidos</label>
                <input type="text" value={form.last_name} onChange={set('last_name')} className={field} required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Teléfono</label>
              <input type="tel" value={form.phone} onChange={set('phone')} className={field} required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cédula</label>
              <input type="text" value={form.document_id} onChange={set('document_id')} className={field} />
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:text-neutral-900 transition-colors">Cancelar</button>
          <button form="add-patient-form" type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm font-medium">{isSaving ? 'Guardando...' : 'Guardar Paciente'}</button>
        </div>
      </div>
    </div>
  );
}
