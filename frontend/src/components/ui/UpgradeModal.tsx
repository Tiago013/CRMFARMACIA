'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export default function UpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const handleLimitExceeded = (e: any) => {
      setDetail(e.detail);
      setIsOpen(true);
    };
    
    window.addEventListener('limit-exceeded', handleLimitExceeded);
    
    return () => {
      window.removeEventListener('limit-exceeded', handleLimitExceeded);
    };
  }, []);

  if (!isOpen || !detail) return null;

  const resourceNames: any = {
    patients: 'Pacientes',
    pos_transactions: 'Transacciones POS',
    wa_messages: 'Mensajes de WhatsApp',
    users: 'Usuarios',
    branches: 'Sucursales',
    storage_mb: 'Almacenamiento (MB)'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#111] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center border-b border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <ShieldAlert size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white text-center">
            Límite Alcanzado
          </h2>
          <p className="text-red-600 dark:text-red-400 text-center font-medium mt-2">
            Has llegado al 100% de tu capacidad de {resourceNames[detail.resource] || detail.resource}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4 mb-6 border border-neutral-100 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-neutral-500">Uso Actual</span>
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {detail.used} / {detail.limit}
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Haz upgrade para continuar creciendo:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Aumenta inmediatamente el límite de <strong>{resourceNames[detail.resource] || detail.resource}</strong> y otros recursos.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Desbloquea funcionalidades premium.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex gap-3">
          <button 
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-3 text-sm font-bold border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
          >
            Más Tarde
          </button>
          <a
            href={detail.upgrade_url || "/settings/billing"}
            className="flex-1 px-4 py-3 text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-center shadow-lg shadow-indigo-600/20"
          >
            Actualizar Plan
          </a>
        </div>
        
      </div>
    </div>
  );
}
