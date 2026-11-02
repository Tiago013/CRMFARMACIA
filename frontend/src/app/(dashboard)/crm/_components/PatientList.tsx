import { Search } from 'lucide-react';

// Directorio de pacientes (columna izquierda)
export function PatientList({ patients, selectedId, onSelect, search, onSearch }: {
  patients: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <div className="w-full md:w-[320px] flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#050505] shrink-0">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative group">
          <Search className="absolute left-2.5 top-2 text-neutral-400" size={14} />
          <input
            type="text" value={search} onChange={(e) => onSearch(e.target.value)}
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
            const isActive = p.id === selectedId;
            return (
              <li key={p.id} onClick={() => onSelect(p.id)} className={`p-4 cursor-pointer transition-colors ${isActive ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/30'}`}>
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
                      {p.tags.slice(0, 2).map((t: string, idx: number) => (
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
  );
}
