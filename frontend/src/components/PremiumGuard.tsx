import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/axios';
import { Lock, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PremiumGuardProps {
  children: React.ReactNode;
  featureName: string;
  requiredPlan?: 'PRO' | 'ENTERPRISE';
}

export default function PremiumGuard({ children, featureName, requiredPlan = 'PRO' }: PremiumGuardProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await apiClient.get('/billing/info');
        const plan = res.data.plan;
        
        if (requiredPlan === 'PRO' && (plan === 'PRO' || plan === 'ENTERPRISE')) {
          setHasAccess(true);
        } else if (requiredPlan === 'ENTERPRISE' && plan === 'ENTERPRISE') {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (e) {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, [requiredPlan]);

  if (loading) {
    return <div className="p-8 text-neutral-500 animate-pulse">Verificando licencia...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-[#FBFBFB] dark:bg-[#020202] px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={28} className="text-neutral-400" />
          </div>
          
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">
            Función Premium
          </h2>
          <p className="text-neutral-500 text-sm mb-8">
            El módulo de <strong>{featureName}</strong> requiere un plan {requiredPlan} o superior. Mejora tu suscripción para desbloquear el máximo potencial de tu farmacia.
          </p>

          <Link 
            href="/billing"
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30"
          >
            <Zap size={18} className="text-indigo-100" />
            Mejorar Plan Ahora
            <ArrowRight size={18} />
          </Link>
          
          <Link href="/dashboard" className="block mt-4 text-sm font-bold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
