'use client';

import { useState, useEffect } from 'react';
import { PackageOpen, TrendingUp, TrendingDown, RefreshCcw, DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { apiClient as api } from '@/lib/axios';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
};

export default function COGSTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/finance/cogs');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('Error fetching COGS', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400 font-medium">
        <RefreshCcw className="animate-spin mr-2" size={20} /> Cargando Costo de Ventas...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">COGS Total</h3>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xl lg:text-2xl font-black text-rose-600 dark:text-rose-400 truncate pr-2">{formatCurrency(data.metrics.totalCogs)}</span>
            <div className="bg-rose-50 text-rose-600 p-2 rounded-lg dark:bg-rose-900/30 flex-shrink-0"><PackageOpen size={18} /></div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">% de Ingresos (COGS Margin)</h3>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xl lg:text-2xl font-black text-neutral-900 dark:text-white truncate pr-2">
              {data.metrics.cogsPercent.toFixed(1)}%
            </span>
            <div className="bg-neutral-100 text-neutral-600 p-2 rounded-lg dark:bg-neutral-900 dark:text-neutral-400 flex-shrink-0"><PieChartIcon size={18} /></div>
          </div>
        </div>

        <div className="p-5 bg-emerald-600 border border-emerald-700 rounded-xl shadow-sm text-white flex flex-col justify-between">
          <h3 className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-2">Margen Bruto Real</h3>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xl lg:text-2xl font-black truncate pr-2">
              {data.metrics.marginPercent.toFixed(1)}%
            </span>
            <TrendingUp className="text-emerald-200 flex-shrink-0" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">Tendencia Mensual de Costos (COGS)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} tickFormatter={(v) => `$${v/1000}k`} />
                <RechartsTooltip cursor={{fill: '#f5f5f5'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#111', color: '#fff'}} itemStyle={{color: '#fff'}} formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="cogs" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-0 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111]">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Desglose de COGS por Producto</h3>
            <p className="text-xs text-neutral-500 mt-1">Los que más cuestan al inventario (Top)</p>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white dark:bg-[#0A0A0A] sticky top-0 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Cant</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Costo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {data.productsList.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate max-w-[120px]" title={item.name}>{item.name}</p>
                      <p className="text-[10px] text-neutral-500 truncate max-w-[120px]">{item.category}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400 text-right font-medium">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-xs text-rose-600 dark:text-rose-400 font-bold text-right">
                      {formatCurrency(item.totalCogs)}
                    </td>
                  </tr>
                ))}
                {data.productsList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-xs text-neutral-500">
                      No hay datos de ventas con costos asociados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
