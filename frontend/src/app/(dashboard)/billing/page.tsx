'use client';

import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Zap, ArrowRight, Download, ExternalLink, AlertCircle, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export default function BillingPage() {
  const { user } = useAuthStore();
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Mocked data for the UI
  const currentPlan = 'PRO';
  const planStatus = 'active'; // 'active', 'past_due', 'trialing'
  const nextBillingDate = '3/6/2026';
  
  const usage = {
    pos_transactions: { used: 4500, limit: 10000, label: 'Transacciones POS (Este mes)' },
    wa_messages: { used: 312, limit: 3000, label: 'Mensajes WhatsApp (Este mes)' },
    patients: { used: 1847, limit: 10000, label: 'Pacientes en CRM' },
    branches: { used: 1, limit: 3, label: 'Sucursales' },
    users: { used: 4, limit: 10, label: 'Usuarios del equipo' },
  };

  const handleOpenPortal = () => {
    setLoadingPortal(true);
    // Simulate API call to get Stripe portal URL
    setTimeout(() => {
      setLoadingPortal(false);
      alert('Abriendo portal de pagos...');
    }, 1000);
  };

  const renderProgressBar = (used: number, limit: number, label: string) => {
    const percent = Math.min(100, Math.round((used / limit) * 100));
    let colorClass = 'bg-emerald-500';
    if (percent > 70) colorClass = 'bg-amber-500';
    if (percent > 90) colorClass = 'bg-red-500';

    return (
      <div className="mb-4 last:mb-0">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
          <span className="text-neutral-500">{used.toLocaleString()} / {limit.toLocaleString()}</span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
          <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#FBFBFB] dark:bg-[#020202] overflow-y-auto">
      {/* Header Premium */}
      <div className="px-8 py-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            Facturación y Suscripción
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Gestiona tu plan SaaS de FarmaAI y límites de sucursales.</p>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Plan y Uso */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Sección 1: Plan Actual */}
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-1">Plan Actual</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{currentPlan}</span>
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-2">Tu próximo cobro es el <strong>{nextBillingDate}</strong>.</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-neutral-900 dark:text-white">$189</div>
                  <div className="text-xs font-medium text-neutral-500">USD / mes</div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button className="flex-1 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white font-bold py-2 rounded-lg transition-colors text-sm">
                  Cambiar Plan
                </button>
                <button className="flex-1 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#111111] text-neutral-600 dark:text-neutral-400 font-bold py-2 rounded-lg transition-colors text-sm">
                  Cancelar Suscripción
                </button>
              </div>
            </div>

            {/* Sección 2: Uso Actual */}
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-neutral-900 dark:text-white mb-6">Uso de recursos este mes</h3>
              {Object.values(usage).map((item, idx) => (
                <div key={idx}>
                  {renderProgressBar(item.used, item.limit, item.label)}
                </div>
              ))}
            </div>

            {/* Sección 4: Historial de Facturas */}
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
                <h3 className="font-bold text-neutral-900 dark:text-white">Historial de Facturas</h3>
                <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Ver todas</button>
              </div>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                    <td className="px-5 py-4 font-medium text-neutral-900 dark:text-white">May 03, 2026</td>
                    <td className="px-5 py-4 text-neutral-500">$189.00</td>
                    <td className="px-5 py-4"><span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">Pagada</span></td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-neutral-400 hover:text-indigo-600"><Download size={16} /></button>
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                    <td className="px-5 py-4 font-medium text-neutral-900 dark:text-white">Apr 03, 2026</td>
                    <td className="px-5 py-4 text-neutral-500">$189.00</td>
                    <td className="px-5 py-4"><span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">Pagada</span></td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-neutral-400 hover:text-indigo-600"><Download size={16} /></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* Columna Derecha: Pagos y Upsell */}
          <div className="space-y-8">
            
            {/* Sección 3: Método de Pago */}
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Método de Pago</h3>
              <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-[#111111] rounded-lg border border-neutral-200 dark:border-neutral-800 mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-neutral-900 dark:text-white">Visa terminada en 4242</div>
                  <div className="text-xs text-neutral-500">Expira 12/28</div>
                </div>
              </div>
              <button 
                onClick={handleOpenPortal}
                disabled={loadingPortal}
                className="w-full flex items-center justify-center gap-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#111111] font-bold py-2 rounded-lg transition-colors text-sm text-neutral-700 dark:text-neutral-300"
              >
                {loadingPortal ? 'Cargando...' : 'Actualizar Tarjeta'} <ExternalLink size={14} />
              </button>
            </div>

            {/* Sección 5: Banner de Upgrade */}
            {currentPlan !== 'ENTERPRISE' && (
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-30"></div>
                
                <h3 className="font-black text-white text-xl mb-2 flex items-center gap-2">
                  <Zap className="text-amber-400" /> Desbloquea Enterprise
                </h3>
                <p className="text-indigo-200 text-sm mb-5">El motor definitivo para expandir tu negocio sin límites.</p>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                    <CheckCircle2 size={16} className="text-emerald-400" /> Sucursales ilimitadas
                  </li>
                  <li className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                    <CheckCircle2 size={16} className="text-emerald-400" /> API B2B & White-label
                  </li>
                  <li className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                    <CheckCircle2 size={16} className="text-emerald-400" /> Motor IA Dedicado
                  </li>
                  <li className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                    <CheckCircle2 size={16} className="text-emerald-400" /> CSM + Soporte 24/7
                  </li>
                </ul>
                
                <button className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-black py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                  Contactar Ventas <ArrowRight size={16} />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
