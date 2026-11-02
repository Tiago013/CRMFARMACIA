import { useState } from 'react';
import { Search } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';
import { inputClass, labelClass } from './widgets';

function initialForm(p: any) {
  return {
    first_name: p?.first_name || '',
    last_name: p?.last_name || '',
    phone: p?.phone || '',
    document_id: p?.document_id || '',
    email: p?.email || p?.preferences?.email || '',
    address: p?.address || p?.preferences?.address || '',
    eps: p?.eps || p?.preferences?.eps || 'Sura',
    blood_group: p?.blood_group || p?.preferences?.blood_group || p?.preferences?.blood_type || 'O+',
    birth_date: p?.birth_date ? new Date(p.birth_date).toISOString().split('T')[0] : '',
    allergies: p?.allergies || '',
    medical_notes: p?.medical_notes || '',
    emergency_contact_name: p?.emergency_contact_name || '',
    emergency_contact_phone: p?.emergency_contact_phone || '',
  };
}

// Perfil ampliado del paciente: datos personales, clínicos y de contacto
export function EditPatientModal({ patient, onClose, onSaved, onDeleted }: {
  patient: any;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
  onDeleted: () => Promise<unknown>;
}) {
  const [form, setForm] = useState(() => initialForm(patient));
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [field]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/crm/patients/${patient.id}`, {
        ...form,
        birth_date: form.birth_date || null,
        preferences: { ...(patient.preferences || {}) },
      });
      await onSaved();
      onClose();
    } catch {
      alert("Error al actualizar");
    }
  };

  const remove = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/crm/patients/${patient.id}`);
      await onDeleted();
      onClose();
    } catch {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Perfil del Paciente</h3>
            <p className="text-xs text-neutral-500">Gestión de datos clínicos y comerciales.</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-patient-form" onSubmit={save} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Información Personal</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre Completo</label>
                  <input type="text" value={form.first_name + " " + form.last_name} onChange={(e) => { const parts = e.target.value.split(" "); setForm({ ...form, first_name: parts[0] || "", last_name: parts.slice(1).join(" ") }); }} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Cédula / DNI</label>
                  <input type="text" value={form.document_id} onChange={set('document_id')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha de Nacimiento</label>
                  <input type="date" value={form.birth_date} onChange={set('birth_date')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Dirección</label>
                  <input type="text" value={form.address} onChange={set('address')} className={inputClass} />
                </div>
              </div>
            </div>

            <hr className="border-neutral-200 dark:border-neutral-800" />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Perfil Clínico</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>EPS / Aseguradora</label>
                  <select value={form.eps} onChange={set('eps')} className={inputClass}>
                    <option>Sura</option>
                    <option>Coomeva</option>
                    <option>Sanitas</option>
                    <option>Nueva EPS</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Grupo Sanguíneo</label>
                  <select value={form.blood_group} onChange={set('blood_group')} className={inputClass}>
                    <option>O+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>AB+</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Alergias Conocidas</label>
                  <input type="text" value={form.allergies} onChange={set('allergies')} placeholder="Ej: Penicilina, Aspirina (separadas por coma)" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Condiciones Crónicas / Tags Clínicos</label>
                  <input type="text" defaultValue={patient.tags.join(", ")} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Notas Médicas</label>
                  <textarea rows={2} value={form.medical_notes} onChange={set('medical_notes')} placeholder="Observaciones generales..." className={inputClass}></textarea>
                </div>
              </div>
            </div>

            <hr className="border-neutral-200 dark:border-neutral-800" />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Familia y Contacto</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contacto de Emergencia</label>
                  <input type="text" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} placeholder="Nombre completo" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono Emergencia</label>
                  <input type="tel" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} placeholder="+57..." className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Grupo Familiar (Búsqueda)</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 text-neutral-400" size={14} />
                    <input type="text" placeholder="Buscar y vincular familiar..." className={`${inputClass} pl-8`} />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between bg-neutral-50 dark:bg-[#111111]">
          <button type="button" onClick={remove} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Eliminar Paciente</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800">Cancelar</button>
            <button type="submit" form="edit-patient-form" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors">Guardar Cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}
