'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, DollarSign, Activity, TrendingUp, AlertTriangle, 
  Search, Shield, Star, Filter, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    // Only allow actual super admins in production. Here we assume admin has access for demo purposes.
    const fetchMetrics = async () => {
      try {
        const response = await apiClient.get('/saas/admin/metrics');
        setMetrics(response.data);
        
        const tenantsResponse = await apiClient.get('/saas/admin/tenants');
        setTenants(tenantsResponse.data);
      } catch (error) {
        toast.error('Error fetching SaaS metrics');
      }
    };
    fetchMetrics();
  }, []);

  if (!metrics) {
    return <div className="p-8 text-neutral-500">Cargando Super Admin Dashboard...</div>;
  }

  const handleImpersonate = (tenantId: string) => {
    toast.success(`Impersonando al tenant ${tenantId}. Recargando sistema...`);
    // Logic to set token and reload
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#FDFDFD] dark:bg-[#020202]">
      {/* Header Premium */}
      <div className="px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-[#000000]">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="text-indigo-600" size={18} />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Super Admin</span>
            </div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white">
              FarmaAI SaaS Control Center
            </h1>
            <p className="text-neutral-500 text-sm mt-1">Métricas globales y gestión de clientes B2B.</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Sistema Operativo
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="MRR (Ingreso Mensual)" 
            value={`$${(metrics.mrr).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`} 
            trend="+12%" 
            isPositive={true} 
            icon={<DollarSign size={20} className="text-emerald-600" />} 
          />
          <MetricCard 
            title="Tenants Activos" 
            value={metrics.tenants.total_active} 
            trend="+5 este mes" 
            isPositive={true} 
            icon={<Building2 size={20} className="text-indigo-600" />} 
          />
          <MetricCard 
            title="ARPU (Promedio/Tenant)" 
            value={`$${metrics.arpu.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`} 
            trend="+2.1%" 
            isPositive={true} 
            icon={<TrendingUp size={20} className="text-blue-600" />} 
          />
          <MetricCard 
            title="Churn Rate" 
            value={`${metrics.tenants.churn_rate_percent}%`} 
            trend="-0.5%" 
            isPositive={true} // Lower churn is positive
            icon={<AlertTriangle size={20} className="text-amber-600" />} 
          />
        </div>

        {/* Extended Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
              <Activity className="text-indigo-500" size={18} /> Uso Global de la Plataforma
            </h3>
            <div className="grid grid-cols-3 gap-6 divide-x divide-neutral-100 dark:divide-neutral-800">
              <div className="px-4 text-center">
                <p className="text-sm text-neutral-500 mb-1">Transacciones (Total)</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">{metrics.usage.total_transactions.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="px-4 text-center">
                <p className="text-sm text-neutral-500 mb-1">Adopción IA</p>
                <p className="text-2xl font-black text-indigo-600">{metrics.usage.ai_adoption_percent}%</p>
              </div>
              <div className="px-4 text-center">
                <p className="text-sm text-neutral-500 mb-1">Usuarios Activos (MAU)</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">{metrics.usage.mau.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
            
            <div className="mt-8 border-t border-neutral-100 dark:border-neutral-800 pt-6">
               <h4 className="font-bold text-sm text-neutral-700 dark:text-neutral-300 mb-4">Métricas Unitarias Adicionales</h4>
               <div className="flex gap-8 text-sm">
                 <div><span className="text-neutral-500">CAC Estimado:</span> <span className="font-bold">$120 USD</span></div>
                 <div><span className="text-neutral-500">LTV Estimado:</span> <span className="font-bold">$8,800 USD</span></div>
                 <div><span className="text-neutral-500">Net MRR Growth:</span> <span className="font-bold text-emerald-500">+${metrics.net_mrr_growth}</span></div>
               </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="font-bold text-neutral-900 dark:text-white mb-6">Distribución de Planes</h3>
            <div className="space-y-4 flex-1">
              <PlanBar name="Starter" count={metrics.tenants.starter} total={metrics.tenants.total_active} color="bg-neutral-500" />
              <PlanBar name="PRO" count={metrics.tenants.pro} total={metrics.tenants.total_active} color="bg-indigo-500" />
              <PlanBar name="Enterprise" count={metrics.tenants.enterprise} total={metrics.tenants.total_active} color="bg-amber-500" />
            </div>
          </div>
        </div>

        {/* Tenant List Table */}
        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
            <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Building2 size={18} /> Directorio de Clientes (Tenants)
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input type="text" placeholder="Buscar farmacia..." className="pl-9 pr-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md outline-none focus:border-indigo-500 bg-white dark:bg-[#050505]" />
              </div>
              <button className="p-1.5 border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                <Filter size={16} />
              </button>
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white dark:bg-[#050505] border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider font-bold">
                <th className="px-6 py-3">Tenant / Farmacia</th>
                <th className="px-6 py-3">Plan Base</th>
                <th className="px-6 py-3">MRR</th>
                <th className="px-6 py-3">Salud / Riesgo</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {tenants.map((t) => (
                <TenantRow 
                  key={t.id}
                  name={t.name} 
                  id={t.id} 
                  plan={t.plan} 
                  mrr={t.mrr} 
                  status={t.status} 
                  lastActive={t.lastActive} 
                  onImpersonate={handleImpersonate} 
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, isPositive, icon }: any) {
  return (
    <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 p-5 rounded-xl shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-bold text-neutral-500">{title}</h3>
        <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-black text-neutral-900 dark:text-white">{value}</p>
        <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
    </div>
  );
}

function PlanBar({ name, count, total, color }: any) {
  const percent = Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1">
        <span>{name} ({count})</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden flex">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function TenantRow({ name, id, plan, mrr, status, lastActive, onImpersonate }: any) {
  return (
    <tr className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors bg-white dark:bg-[#0A0A0A]">
      <td className="px-6 py-4">
        <div className="font-bold text-neutral-900 dark:text-white">{name}</div>
        <div className="text-xs text-neutral-500">ID: {id} • Activo: {lastActive}</div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
          plan === 'PRO' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
          plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
        }`}>{plan}</span>
      </td>
      <td className="px-6 py-4 font-mono font-bold">${mrr}</td>
      <td className="px-6 py-4">
        {status === 'healthy' ? (
          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Saludable</span>
        ) : (
          <span className="flex items-center gap-1 text-red-500 text-xs font-bold"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Riesgo Churn</span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <button onClick={() => onImpersonate(id)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3">
          Impersonar
        </button>
        <button className="text-xs font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
          Gestionar
        </button>
      </td>
    </tr>
  );
}
