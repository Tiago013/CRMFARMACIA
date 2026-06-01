'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { BrainCircuit, AlertTriangle, TrendingUp, HelpCircle } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';
import { format } from 'date-fns';
import FeatureGate from '@/components/ui/FeatureGate';
import PremiumGuard from '@/components/PremiumGuard';
import AIAssistantTab from '@/components/forecasting/AIAssistantTab';

export default function ForecastingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'predicciones' | 'ia'>('predicciones');

  const fetchForecast = async (productId?: string) => {
    setLoading(true);
    try {
      const url = productId ? `/forecasting/demand?productId=${productId}` : '/forecasting/demand';
      const res = await api.get(url);
      
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
      if (!productId && res.data.product_id) {
        setSelectedProductId(res.data.product_id);
      }
    } catch (error) {
      console.error("Error fetching forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProductId(newId);
    fetchForecast(newId);
  };

  if (loading && !data) {
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
    <PremiumGuard featureName="Predicciones IA (Forecasting)" requiredPlan="PRO">
      <div className="flex-1 p-8 overflow-y-auto bg-[#FDFDFD] dark:bg-[#050505]">
        <FeatureGate featureName="advanced_analytics">
          <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Headers */}
          {activeTab === 'predicciones' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <BrainCircuit className="text-indigo-600 dark:text-indigo-400" />
                  Demand Forecasting
                </h1>
                <p className="text-neutral-500 text-sm mt-1">Predicción de demanda impulsada por Machine Learning.</p>
              </div>
              
              {data?.all_products && (
                <div className="w-full md:w-72">
                  <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">Seleccionar Medicamento</label>
                  <select 
                    value={selectedProductId}
                    onChange={handleProductChange}
                    disabled={loading}
                    className="w-full bg-white dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:opacity-50"
                  >
                    {data.all_products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.brand_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ia' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <BrainCircuit className="text-indigo-600 dark:text-indigo-400" />
                  Asesor Clínico IA
                </h1>
                <p className="text-neutral-500 text-sm mt-1">Análisis avanzado de perfiles de pacientes mediante Inteligencia Artificial.</p>
              </div>
            </div>
          )}

          {loading && data && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              Recalculando proyecciones para el producto seleccionado...
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setActiveTab('predicciones')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'predicciones' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Predicciones
            </button>
            <button
              onClick={() => setActiveTab('ia')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ia' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              IA Asesor
            </button>
          </div>

          {activeTab === 'predicciones' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
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

              {/* Executive Summary Cards */}
              {data?.executive_summary && (
                <>
                  <div className="p-5 bg-indigo-50/50 dark:bg-[#0A0A0A] border border-indigo-100 dark:border-neutral-800 rounded-xl">
                    <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-400 flex items-center gap-2 mb-2">
                      <BrainCircuit size={16} />
                      Análisis de la Inteligencia Artificial
                    </h3>
                    <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed">
                      El modelo proyecta una demanda total de <strong className="text-neutral-900 dark:text-white">{data.executive_summary.total_predicted_demand} unidades</strong> para los próximos 15 días, mostrando una tendencia <strong className="text-neutral-900 dark:text-white">{data.executive_summary.trend_direction.toLowerCase()}</strong>. Te sugerimos mantener un stock de seguridad de <strong className="text-neutral-900 dark:text-white">{data.executive_summary.recommended_stock} unidades</strong> para evitar quiebres de inventario, dado el nivel de confianza actual del {(data.confidence_level * 100).toFixed(0)}%.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Demanda Total (15 días)</p>
                      <p className="text-3xl font-black text-neutral-900 dark:text-white">{data.executive_summary.total_predicted_demand} <span className="text-base font-medium text-neutral-400">unid.</span></p>
                    </div>
                    <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Tendencia</p>
                      <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{data.executive_summary.trend_direction}</p>
                    </div>
                    <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Stock Recomendado</p>
                      <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{data.executive_summary.recommended_stock} <span className="text-base font-medium text-blue-300 dark:text-blue-900/50">unid.</span></p>
                    </div>
                  </div>
                </>
              )}

              {/* Main Chart */}
              <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative">
                {loading && data && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 backdrop-blur-[1px] rounded-xl flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}
                
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
                  <p className="text-3xl font-semibold text-neutral-900 dark:text-white">{data?.customer_metrics?.clv || "$0"}</p>
                  <p className="text-xs text-neutral-400 mt-2">Basado en pacientes actuales</p>
                </div>
                
                <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-medium text-neutral-500">Riesgo de Churn Global</h3>
                    <HelpCircle size={14} className="text-neutral-400" />
                  </div>
                  <p className="text-3xl font-semibold text-neutral-900 dark:text-white">{data?.customer_metrics?.churn_rate || "0"}%</p>
                  <p className="text-xs text-neutral-400 mt-2">Dentro de parámetros normales</p>
                </div>

                <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-medium text-neutral-500">Frecuencia de Compra</h3>
                    <HelpCircle size={14} className="text-neutral-400" />
                  </div>
                  <p className="text-3xl font-semibold text-neutral-900 dark:text-white">{data?.customer_metrics?.avg_purchase_days || 0} Días</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2">Promedio general</p>
                </div>
              </div>
            </div>
          ) : (
            <AIAssistantTab data={data} />
          )}

          </div>
        </FeatureGate>
      </div>
    </PremiumGuard>
  );
}
