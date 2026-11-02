import { Search } from 'lucide-react';

export function PatientModal({ patients, search, onSearch, onSelect, onClose }: {
  patients: any[];
  search: string;
  onSearch: (value: string) => void;
  onSelect: (patient: any) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Asignar Paciente</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">&times;</button>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input type="text" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por nombre o cédula..." className="w-full pl-8 pr-3 py-1.5 bg-neutral-100 dark:bg-[#111111] border-none rounded-md text-sm outline-none" autoFocus />
          </div>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-48 overflow-y-auto">
            {patients.map((p: any) => (
              <li
                key={p.id}
                onClick={() => onSelect(p)}
                className="py-2.5 px-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer rounded-md flex justify-between items-center group"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white">{p.first_name} {p.last_name}</span>
                  <span className="text-[10px] text-neutral-400">CC {p.document_id} · {p.phone}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
