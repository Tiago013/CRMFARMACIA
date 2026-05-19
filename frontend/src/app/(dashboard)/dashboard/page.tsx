"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiClient as api } from '@/lib/axios';
import { Spinner } from '@/components/ui/Spinner';
import { BarChart3, PieChart as PieChartIcon, Download, SlidersHorizontal, Table, Users, Package, DollarSign, AlertTriangle } from 'lucide-react';

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
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

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
  const [activeTab, setActiveTab] = useState('overview');

  // Report state
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

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

  const handleOpenReport = async (endpoint: string) => {
    setSelectedReport(endpoint);
    setReportLoading(true);
    setReportData(null);
    try {
      const response = await api.get(`/analytics/reports/${endpoint}`);
      setReportData(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadCSV = async (endpoint: string, filename: string) => {
    try {
      // Si ya tenemos los datos y es el mismo reporte, no volvemos a descargar
      let dataToExport = reportData;
      if (selectedReport !== endpoint || !reportData) {
         const response = await api.get(`/analytics/reports/${endpoint}`);
         dataToExport = response.data;
      }
      
      if (!dataToExport || dataToExport.length === 0) return;

      const keys = Object.keys(dataToExport[0]);
      const csvContent = [
        keys.join(','),
        ...dataToExport.map((row: any) => keys.map(k => `"${row[k] !== null ? row[k] : ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-neutral-400 space-y-4">
        <Spinner size={32} />
        <span className="text-sm font-medium">Cargando Analytics...</span>
      </div>
    );
  }

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000000]">
      {/* Header Premium */}
      <div className="flex justify-between items-end px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Analytics Engine <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ml-2">PRO</span>
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Inteligencia de negocios, reportes exportables y dashboard en tiempo real.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-[#FDFDFD] dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 text-sm px-4 py-2 font-medium rounded-lg outline-none text-neutral-700 dark:text-neutral-300 shadow-sm">
            <option>Últimos 7 días</option>
            <option>Este mes</option>
            <option>Este trimestre</option>
            <option>Año actual</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#050505]">
        <div className="flex space-x-6">
          <button onClick={() => setActiveTab('overview')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            <BarChart3 size={16} /> Overview General
          </button>
          <button onClick={() => setActiveTab('reports')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'reports' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            <Table size={16} /> Reportes Predefinidos
          </button>
          <button onClick={() => setActiveTab('builder')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'builder' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            <SlidersHorizontal size={16} /> Creador de Reportes
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#FBFBFB] dark:bg-[#020202]">
        
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.kpis.map((kpi, i) => (
                <div key={i} className="p-5 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                  <h3 className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">{kpi.title}</h3>
                  <div className="flex items-baseline gap-2 mt-2 justify-between">
                    <span className="text-3xl font-black text-neutral-900 dark:text-white">{kpi.value}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${kpi.trend === 'up' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                      {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
              {/* Revenue Area Chart */}
              <div className="lg:col-span-2 flex flex-col p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Tendencia de Ingresos</h3>
                  <button className="text-neutral-400 hover:text-indigo-600 transition-colors"><Download size={16}/></button>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.sales_trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val) => `$${val/1000}k`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff', fontSize: '12px', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '3 3' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="flex flex-col p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Ventas por Categoría</h3>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.category_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.category_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', backgroundColor: '#111', borderColor: '#333' }} itemStyle={{color: '#fff', fontWeight: 'bold'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {data.category_distribution.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="truncate">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          selectedReport ? (
            <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedReport(null)} className="text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                    ← Volver
                  </button>
                  <h3 className="font-bold text-neutral-900 dark:text-white">Vista de Reporte</h3>
                </div>
                <button 
                  onClick={() => handleDownloadCSV(selectedReport, selectedReport)}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Download size={14} /> Exportar CSV
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {reportLoading ? (
                  <div className="flex justify-center items-center h-40 text-neutral-400">
                    <Spinner size={24} />
                  </div>
                ) : !reportData || reportData.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500">No hay datos disponibles para este reporte en la sede actual.</div>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-[#111111] border-b border-neutral-200 dark:border-neutral-800">
                        {Object.keys(reportData[0]).map(k => (
                          <th key={k} className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">{k.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {reportData.map((row, i) => (
                        <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-[#111111]">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-3 text-neutral-900 dark:text-neutral-300">
                              {typeof val === 'number' && val > 100 ? `$${val.toLocaleString()}` : val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div onClick={() => handleOpenReport('top-products')} className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm group hover:border-indigo-500 transition-colors cursor-pointer">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Package size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-lg mb-2">Top 20 Productos</h3>
                <p className="text-sm text-neutral-500 mb-4">Análisis de los productos más vendidos con márgenes y velocidad de rotación semanal.</p>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenReport('top-products'); }} className="flex-1 py-1.5 text-xs font-bold border border-neutral-300 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Ver Tabla</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadCSV('top-products', 'top_productos'); }} className="flex-1 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded hover:bg-indigo-100 transition-colors">Descargar .csv</button>
                </div>
              </div>

              <div onClick={() => handleOpenReport('vip-patients')} className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm group hover:border-emerald-500 transition-colors cursor-pointer">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Users size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-lg mb-2">Pacientes VIP (LTV)</h3>
                <p className="text-sm text-neutral-500 mb-4">Listado de los 50 clientes más valiosos ordenados por Lifetime Value y retención.</p>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenReport('vip-patients'); }} className="flex-1 py-1.5 text-xs font-bold border border-neutral-300 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Ver Tabla</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadCSV('vip-patients', 'pacientes_vip'); }} className="flex-1 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded hover:bg-emerald-100 transition-colors">Descargar .csv</button>
                </div>
              </div>

              <div onClick={() => handleOpenReport('churn-risk')} className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm group hover:border-amber-500 transition-colors cursor-pointer">
                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-lg mb-2">Riesgo de Churn</h3>
                <p className="text-sm text-neutral-500 mb-4">Pacientes con enfermedades crónicas que no han comprado su refill en más de 30 días.</p>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenReport('churn-risk'); }} className="flex-1 py-1.5 text-xs font-bold border border-neutral-300 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Ver Tabla</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadCSV('churn-risk', 'riesgo_churn'); }} className="flex-1 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded hover:bg-amber-100 transition-colors">Descargar .csv</button>
                </div>
              </div>
              
              <div onClick={() => handleOpenReport('stagnant-inventory')} className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm group hover:border-blue-500 transition-colors cursor-pointer">
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-lg mb-2">Inventario Estancado</h3>
                <p className="text-sm text-neutral-500 mb-4">Productos que no han tenido movimiento en los últimos 45 días, capital inmovilizado.</p>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenReport('stagnant-inventory'); }} className="flex-1 py-1.5 text-xs font-bold border border-neutral-300 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Ver Tabla</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadCSV('stagnant-inventory', 'inventario_estancado'); }} className="flex-1 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded hover:bg-blue-100 transition-colors">Descargar .csv</button>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'builder' && (
          <div className="flex items-center justify-center h-full">
            <div className="max-w-2xl text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <SlidersHorizontal size={36} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white">Generador Visual de Reportes</h2>
              <p className="text-neutral-500 max-w-lg mx-auto">Selecciona dimensiones (fecha, cajero, paciente) y métricas (ventas, margen) usando el sistema de Drag & Drop para generar y exportar cualquier reporte de manera ilimitada.</p>
              <button className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors">
                Crear Nuevo Reporte 
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
