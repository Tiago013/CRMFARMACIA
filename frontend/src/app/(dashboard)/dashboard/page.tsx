"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiClient as api } from '@/lib/axios';
import { Spinner } from '@/components/ui/Spinner';
import { BarChart3, PieChart as PieChartIcon, Download, SlidersHorizontal, Table, Users, Package, DollarSign, AlertTriangle, FileText, X } from 'lucide-react';

// For Recharts, ResponsiveContainer needs dynamic import for SSR, but inner components can be static to prevent props stripping.
import { BarChart as RechartsBarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useRouter } from 'next/navigation';

// Fix SSR for the container wrapper
const ClientResponsiveContainer = dynamic(() => Promise.resolve(ResponsiveContainer), { ssr: false, loading: () => <Spinner size={24} /> });

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

interface PeakHourData {
  hour: string;
  orders: number;
  revenue: number;
}

interface TopProfitableProduct {
  name: string;
  margin_percentage: number;
  net_profit: number;
}

interface ExpirationRiskData {
  status: string;
  value: number;
}

interface DashboardSnapshot {
  kpis: KPIData[];
  sales_trend: SalesChartData[];
  category_distribution: CategoryDistribution[];
  peak_hours: PeakHourData[];
  top_profitable: TopProfitableProduct[];
  expiration_risk: ExpirationRiskData[];
}

const AVAILABLE_DIMENSIONS = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'mes', label: 'Mes' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'producto', label: 'Producto' },
  { key: 'paciente', label: 'Paciente' },
  { key: 'metodo_pago', label: 'Método de Pago' },
  { key: 'sucursal', label: 'Sucursal' },
];

const AVAILABLE_METRICS = [
  { key: 'ventas_totales', label: 'Ventas Totales ($)' },
  { key: 'cantidad_ventas', label: 'Cantidad de Ventas' },
  { key: 'unidades_vendidas', label: 'Unidades Vendidas' },
  { key: 'ticket_promedio', label: 'Ticket Promedio ($)' },
  { key: 'margen_bruto', label: 'Margen Bruto ($)' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('7d');

  // Report state
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Custom Report Builder state
  const [builderDims, setBuilderDims] = useState<string[]>(['fecha']);
  const [builderMetrics, setBuilderMetrics] = useState<string[]>(['ventas_totales']);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [daySalesData, setDaySalesData] = useState<any[] | null>(null);
  const [daySalesLoading, setDaySalesLoading] = useState(false);
  const [builderResult, setBuilderResult] = useState<any[] | null>(null);
  const [builderLoading, setBuilderLoading] = useState(false);
  
  // Odoo P&L state
  const [odooPnL, setOdooPnL] = useState<{income: number, cogs: number, opex: number, net_profit: number} | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const timestamp = new Date().getTime();
        const response = await api.get(`/analytics/snapshot?period=${period}&_t=${timestamp}`);
        console.log("DASHBOARD DATA RECEIVED:", response.data);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchOdooPnL = async () => {
        try {
            const res = await api.get(`/analytics/odoo-pnl?period=${period}`);
            setOdooPnL(res.data);
        } catch (e) {
            console.error("Error fetching Odoo P&L", e);
        }
    };
    
    fetchAnalytics();
    fetchOdooPnL();
  }, [period]);

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
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-[#FDFDFD] dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 text-sm px-4 py-2 font-medium rounded-lg outline-none text-neutral-700 dark:text-neutral-300 shadow-sm"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="month">Este mes</option>
            <option value="quarter">Este trimestre</option>
            <option value="year">Año actual</option>
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

            {/* P&L Card */}
            {odooPnL !== null && (
              <div className="bg-gradient-to-br from-indigo-900 to-[#111111] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-indigo-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={18} className="text-indigo-300" /> Utilidad Neta Contable
                  </h3>
                  <span className="text-xs bg-black/30 px-3 py-1 rounded-full text-indigo-200 font-medium">Tiempo Real</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Ingresos Facturados</p>
                    <p className="text-2xl font-bold mt-1">${odooPnL.income.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-rose-300 text-xs font-semibold uppercase tracking-wider">COGS (Productos)</p>
                    <p className="text-2xl font-bold mt-1">-${odooPnL.cogs.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-rose-300 text-xs font-semibold uppercase tracking-wider">OPEX (Operativos)</p>
                    <p className="text-2xl font-bold mt-1">-${odooPnL.opex.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                    <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wider">Utilidad Neta</p>
                    <p className="text-3xl font-black text-emerald-400 mt-1">${odooPnL.net_profit.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
              {/* Revenue Area Chart */}
              <div className="lg:col-span-2 flex flex-col p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Tendencia de Ingresos</h3>
                  <button className="text-neutral-400 hover:text-indigo-600 transition-colors"><Download size={16}/></button>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <ClientResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={data.sales_trend} 
                      margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                      onClick={(e) => {
                        if (e && e.activeLabel) {
                          router.push(`/transactions?date=${e.activeLabel}`);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0}/>
                          </linearGradient>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" opacity={0.05} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 500 }} dy={10} minTickGap={20} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 500 }} tickFormatter={(val) => `$${val/1000}k`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)', borderColor: '#262626', color: '#fff', fontSize: '13px', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
                          formatter={(value: any) => [new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value), 'Ingresos']}
                          labelFormatter={(label) => `Fecha: ${label}`}
                        />

                      <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, fill: '#fff', stroke: '#6366F1', strokeWidth: 3, filter: 'url(#glow)' }} style={{ filter: 'url(#glow)' }} />
                    </AreaChart>
                  </ClientResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="flex flex-col p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Ventas por Categoría</h3>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1">
                    <ClientResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.category_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                          onClick={(data) => {
                            if (data && data.name) {
                              router.push(`/inventory?category=${encodeURIComponent(data.name)}`);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {data.category_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)', borderColor: '#262626', padding: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                          itemStyle={{color: '#fff', fontWeight: 'bold'}} 
                          formatter={(value: any) => [new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value), 'Ventas']}
                        />
                      </PieChart>
                    </ClientResponsiveContainer>
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

            {/* NEW ENTERPRISE CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
              {/* Peak Hours (Heatmap/Bar) */}
              <div className="flex flex-col p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Horas Pico de Ventas</h3>
                </div>
                  <ClientResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={data.peak_hours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" opacity={0.05} />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 500 }} dy={10} />
                      <YAxis yAxisId="left" orientation="left" stroke="#6366F1" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 500 }} tickFormatter={(val) => `$${val/1000}k`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)', borderColor: '#262626', color: '#fff', fontSize: '13px', borderRadius: '12px' }}
                        cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                        formatter={(value: any) => [new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value), 'Ingresos']}
                        labelFormatter={(label) => `Hora: ${label}`}
                      />
                      <Bar yAxisId="left" dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ClientResponsiveContainer>
              </div>

              {/* Top Profitable Products */}
              <div className="flex flex-col p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Top 5 Rentabilidad (Utilidad Neta)</h3>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <ClientResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={data.top_profitable} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff" opacity={0.05} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373' }} tickFormatter={(val) => `$${val/1000}k`} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} width={80} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)', borderColor: '#262626', color: '#fff', fontSize: '13px', borderRadius: '12px' }}
                        cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                        formatter={(value: any) => [new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value), 'Utilidad Neta']}
                      />
                      <Bar dataKey="net_profit" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.top_profitable?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ClientResponsiveContainer>
                </div>
              </div>

              {/* Expiration Risk */}
              <div className="flex flex-col p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Riesgo de Inventario (Vencimientos)</h3>
                </div>
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                  <div className="flex-1 w-full">
                    <ClientResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expiration_risk}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {data.expiration_risk?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.status.includes('Riesgo') ? '#EF4444' : '#10B981'} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)', borderColor: '#262626', padding: '12px' }} 
                          itemStyle={{color: '#fff', fontWeight: 'bold'}}
                          formatter={(value: any) => `${Number(value).toLocaleString('es-CO')} Lotes/Productos`}
                        />
                      </PieChart>
                    </ClientResponsiveContainer>
                  </div>
                  <div className="mt-2 w-full text-center">
                    <p className="text-xs text-neutral-500 font-medium">El {data.expiration_risk && data.expiration_risk.length > 1 ? ((data.expiration_risk[1].value / ((data.expiration_risk[0].value + data.expiration_risk[1].value) || 1)) * 100).toFixed(1) : 0}% del inventario está en riesgo por vencimiento cercano.</p>
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
                              {typeof val === 'number' && val > 100 ? `$${val.toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : val}
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dimensions */}
              <div className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-4">Dimensiones (Agrupar por)</h3>
                <div className="space-y-2">
                  {AVAILABLE_DIMENSIONS.map(d => (
                    <label key={d.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={builderDims.includes(d.key)}
                        onChange={(e) => {
                          if (e.target.checked) setBuilderDims([...builderDims, d.key]);
                          else setBuilderDims(builderDims.filter(x => x !== d.key));
                        }}
                        className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Metrics */}
              <div className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-4">Métricas (Calcular)</h3>
                <div className="space-y-2">
                  {AVAILABLE_METRICS.map(m => (
                    <label key={m.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={builderMetrics.includes(m.key)}
                        onChange={(e) => {
                          if (e.target.checked) setBuilderMetrics([...builderMetrics, m.key]);
                          else setBuilderMetrics(builderMetrics.filter(x => x !== m.key));
                        }}
                        className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {/* Generate Button */}
            <div className="flex gap-3">
              <button
                disabled={builderDims.length === 0 || builderMetrics.length === 0 || builderLoading}
                onClick={async () => {
                  setBuilderLoading(true);
                  setBuilderResult(null);
                  try {
                    const res = await api.post('/analytics/reports/custom', { dimensions: builderDims, metrics: builderMetrics });
                    setBuilderResult(res.data);
                  } catch (err) { console.error(err); }
                  finally { setBuilderLoading(false); }
                }}
                className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {builderLoading ? 'Generando...' : 'Generar Reporte'}
              </button>
              {builderResult && builderResult.length > 0 && (
                <button
                  onClick={() => {
                    const keys = Object.keys(builderResult![0]);
                    const csv = [keys.join(','), ...builderResult!.map((row: any) => keys.map(k => `"${row[k] !== null ? row[k] : ''}"`).join(','))].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', 'reporte_personalizado.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-6 py-3 text-sm font-bold border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
                >
                  <Download size={16} /> Exportar CSV
                </button>
              )}
            </div>
            {/* Results Table */}
            {builderResult && (
              <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-auto max-h-[500px]">
                  {builderResult.length === 0 ? (
                    <div className="text-center py-10 text-neutral-500">No hay datos para la combinación seleccionada.</div>
                  ) : (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="bg-neutral-50 dark:bg-[#111111] border-b border-neutral-200 dark:border-neutral-800 sticky top-0">
                          {Object.keys(builderResult[0]).map(k => (
                            <th key={k} className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">{k.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {builderResult.map((row, i) => (
                          <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-[#111111]">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-4 py-3 text-neutral-900 dark:text-neutral-300">
                                {typeof val === 'number' && val > 100 ? `$${val.toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Day Sales Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
              <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-indigo-500" /> Ventas del {selectedDay}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {daySalesLoading ? (
                <div className="flex justify-center items-center h-40"><Spinner size={24} /></div>
              ) : daySalesData && daySalesData.length > 0 ? (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-[#111111] border-b border-neutral-200 dark:border-neutral-800">
                      <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">Hora</th>
                      <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">ID Venta</th>
                      <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">Total</th>
                      <th className="px-4 py-3 font-bold text-neutral-500 uppercase tracking-wider text-xs">Método</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {daySalesData.map((sale, i) => (
                      <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-[#111111]">
                        <td className="px-4 py-3 text-neutral-900 dark:text-neutral-300 font-medium">{sale.time}</td>
                        <td className="px-4 py-3 text-neutral-500">{sale.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold">${sale.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 capitalize">{sale.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-neutral-500">No se encontraron ventas para este día.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
