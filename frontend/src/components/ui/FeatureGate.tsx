'use client';

import React from 'react';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  requiredPlan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  currentPlan?: 'STARTER' | 'PRO' | 'ENTERPRISE';
  children: React.ReactNode;
}

export function FeatureGate({ feature, requiredPlan, currentPlan = 'STARTER', children }: FeatureGateProps) {
  const planWeights = {
    'STARTER': 1,
    'PRO': 2,
    'ENTERPRISE': 3
  };

  const hasAccess = planWeights[currentPlan] >= planWeights[requiredPlan];

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      {/* Blurred Content */}
      <div className="blur-sm opacity-50 select-none pointer-events-none">
        {children}
      </div>
      
      {/* Paywall Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/20 dark:bg-black/40 backdrop-blur-[2px]">
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl shadow-xl max-w-sm text-center transform transition-transform hover:scale-105">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h3 className="font-black text-neutral-900 dark:text-white text-lg mb-2">Función Premium</h3>
          <p className="text-sm text-neutral-500 mb-6">
            La función <strong>{feature}</strong> solo está disponible en el plan {requiredPlan} o superior.
          </p>
          <div className="flex gap-2 justify-center">
            <button className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg text-sm font-bold transition-colors">
              Ver Planes
            </button>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
              Actualizar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
