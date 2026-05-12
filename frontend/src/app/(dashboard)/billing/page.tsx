'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Zap, CheckCircle2 } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function BillingPage() {
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const response = await api.get('/billing/status');
        setBillingInfo(response.data);
      } catch (error) {
        console.error("Error fetching billing:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FBFBFB] dark:bg-[#000000] p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Facturación y Suscripción</h1>
          <p className="text-neutral-500 mt-1">Gestiona tu plan SaaS de FarmaAI y límites de sucursales.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Plan Card */}
          <div className="md:col-span-2 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                  Plan Actual: <span className="font-bold text-indigo-600 dark:text-indigo-400">PRO</span>
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Tu próximo cobro es el {new Date(billingInfo?.current_period_end).toLocaleDateString()}.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1">
                <CheckCircle2 size={14} /> Activo
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">Transacciones POS (Este mes)</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{billingInfo?.usage_count} / 10,000</span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${(billingInfo?.usage_count / 10000) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 flex gap-3">
              <Button variant="secondary">Ver Facturas Anteriores</Button>
              <Button variant="primary">Actualizar Método de Pago</Button>
            </div>
          </div>

          {/* Upgrade Banner */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-6 text-white shadow-md flex flex-col justify-between">
            <div>
              <Zap className="mb-4 text-indigo-200" size={28} />
              <h3 className="text-lg font-semibold mb-2">Desbloquea Enterprise</h3>
              <p className="text-indigo-100 text-sm mb-6">
                Obtén sucursales ilimitadas, API B2B, y motor de IA dedicado.
              </p>
            </div>
            <Button className="w-full bg-white text-indigo-700 hover:bg-neutral-50 border-none">
              Contactar Ventas
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
