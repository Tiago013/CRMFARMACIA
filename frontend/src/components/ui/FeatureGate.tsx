'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  featureName: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function FeatureGate({ featureName, children, fallback }: FeatureGateProps) {
  const { user } = useAuthStore();
  
  // Hardcoded mapping for demo since backend may not send all features
  const featurePlans: Record<string, string[]> = {
    'advanced_analytics': ['PRO', 'ENTERPRISE'],
    'api_access': ['ENTERPRISE'],
    'whatsapp_campaigns': ['PRO', 'ENTERPRISE'],
    'unlimited_users': ['ENTERPRISE']
  };

  const requiredPlans = featurePlans[featureName] || [];
  
  // In a real app we would read this from user.plan or tenant details
  // Assuming 'STARTER' internally covers it if not specified
  const currentPlan = user?.plan || 'STARTER'; 
  
  const hasAccess = requiredPlans.length === 0 || requiredPlans.includes(currentPlan);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col items-center justify-center text-center">
      <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 bg-white dark:bg-[#111] rounded-full flex items-center justify-center mb-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
          <Lock size={20} className="text-neutral-500" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
          Característica Premium
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mb-6">
          Esta funcionalidad solo está disponible en planes superiores. Actualiza tu cuenta para desbloquearla.
        </p>
        <Link 
          href="/billing"
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition"
        >
          Ver Planes
        </Link>
      </div>
      
      {/* Blurred preview of the children behind */}
      <div className="opacity-30 pointer-events-none blur-sm w-full select-none">
        {children}
      </div>
    </div>
  );
}
