'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { BrainCircuit, AlertTriangle, TrendingUp, HelpCircle } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';
import { format } from 'date-fns';
import FeatureGate from '@/components/ui/FeatureGate';

export default function ForecastingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await api.get('/forecasting/demand');
        
        // Transformar data para Recharts
        const mergedData = [
          ...res.data.historical_data.map((d: any) => ({
            date: format(new Date(d.date), 'dd MMM'),
            history: d.value,
            forecast: null,
            lower: null,
            upper: null
          })),
          ...res.data.forecast_data.map((d: any) => ({
            date: format(new Date(d.date), 'dd MMM'),
            history: null,
            forecast: d.value,
            lower: d.lower_bound,
            upper: d.upper_bound
          }))
        ];
        
        setData({ ...res.data, chartData: mergedData });
      } catch (error) {
        console.error("Error fetching forecast:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-white dark:bg-[#000000]">
        <div className="flex flex-col items-center gap-4 text-neutral-500">
          <BrainCircuit className="animate-pulse" size={32} />
          <p className="text-sm font-medium tracking-wide">Iniciando motor de predicción Prophet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#FDFDFD] dark:bg-[#050505]">
      <FeatureGate featureName="advanced_analytics">
        <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <BrainCircuit className="text-indigo-600 dark:text-indigo-400" />
            Demand Forecasting
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Predicción de demanda impulsada por Machine Learning.</p>
        </div>

        {/* Explainability Banner */}
        {data?.anomaly_detected && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg flex gap-4">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Anomalía Detectada</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 opacity-90 leading-relaxed">
                {data.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Main Chart */}
        <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Proyección a 15 días</h2>
              <p className="text-xs text-neutral-500">{data?.product_name}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-md text-xs font-semibold">
              <TrendingUp size={14} />
              {(data?.confidence_level * 100).toFixed(0)}% Confianza
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="date" tick={{fontSize: 11}} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tick={{fontSize: 11}} tickLine={false} axisLine={false} tickMargin={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                
                {/* Historical Data */}
                <Line type="monotone" dataKey="history" stroke="#64748B" strokeWidth={2} dot={false} />
                
                {/* Forecast Bounds Area */}
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#colorForecast)" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="#0A0A0A" />
                
                {/* Forecast Mean Line */}
                <Line type="monotone" dataKey="forecast" stroke="#818CF8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Scoring Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-neutral-500">Customer Lifetime Value (Predicho)</h3>
              <HelpCircle size={14} className="text-neutral-400" />
            </div>
            <p className="text-3xl font-semibold text-neutral-900 dark:text-white">$1,240.50</p>
            <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1"><TrendingUp size={12}/> +12% este mes</p>
          </div>
          
          <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-neutral-500">Riesgo de Churn Global</h3>
              <HelpCircle size={14} className="text-neutral-400" />
            </div>
            <p className="text-3xl font-semibold text-neutral-900 dark:text-white">18.5%</p>
            <p className="text-xs text-neutral-400 mt-2">Dentro de parámetros normales</p>
          </div>

          <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-neutral-500">Próxima Compra Promedio</h3>
              <HelpCircle size={14} className="text-neutral-400" />
            </div>
            <p className="text-3xl font-semibold text-neutral-900 dark:text-white">12 Días</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2">Modelo LSTM optimizado</p>
          </div>
        </div>

        </div>
      </FeatureGate>
    </div>
  );
}
