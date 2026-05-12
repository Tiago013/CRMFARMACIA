"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiClient as api } from '@/lib/axios';
import { Spinner } from '@/components/ui/Spinner';

// Dynamic import for Code Splitting and Performance Optimization (Phase 19)
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false, loading: () => <Spinner size={24} /> });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const RechartsTooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });

interface KPIData {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

interface SalesChartData {
  date: string;
  revenue: number;
  orders: number;
}

interface CategoryDistribution {
  name: string;
  value: number;
}

interface DashboardSnapshot {
  kpis: KPIData[];
  sales_trend: SalesChartData[];
  category_distribution: CategoryDistribution[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/analytics/snapshot');
        setData(response.data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-neutral-400 space-y-4">
        <Spinner size={32} />
        <span className="text-sm font-medium">Cargando Analytics...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000000] p-8 overflow-y-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Overview</h1>
          <p className="text-neutral-500 text-sm mt-1">Métricas clave y rendimiento de las últimas semanas.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-[#FDFDFD] dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 text-sm px-3 py-1.5 rounded-md outline-none text-neutral-700 dark:text-neutral-300">
            <option>Últimos 7 días</option>
            <option>Últimos 30 días</option>
            <option>Este año</option>
          </select>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.kpis.map((kpi, i) => (
          <div key={i} className="p-4 bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-md shadow-sm">
            <h3 className="text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">{kpi.title}</h3>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-semibold text-neutral-900 dark:text-white">{kpi.value}</span>
              <span className={`text-xs font-medium ${kpi.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 flex flex-col p-5 bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-md shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-6">Tendencia de Ingresos</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sales_trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Bar Chart */}
        <div className="flex flex-col p-5 bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-md shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-6">Volumen de Órdenes</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sales_trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip 
                  cursor={{ fill: '#333', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
