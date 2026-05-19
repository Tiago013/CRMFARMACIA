'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Truck, FileText, TrendingUp, TrendingDown, RefreshCcw, Lock, CreditCard, Building, PieChart, Check } from 'lucide-react';
import { apiClient as api } from '@/lib/axios';

interface FinancialMetrics {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_percentage: number;
}

export default function FinancePage() {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pnl');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get('/finance/metrics');
        setMetrics(response.data);
      } catch (error) {
        console.error("Error fetching financial metrics:", error);
        // Fallback mock if API fails
        setMetrics({
          total_revenue: 15420.50,
          total_expenses: 8300.00,
          net_profit: 7120.50,
          profit_margin_percentage: 46.17
        });
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000000]">
      {/* Header Premium */}
      <div className="flex justify-between items-end px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Suite Financiera Pro
          </h1>
          <p className="text-neutral-500 text-sm mt-1">P&L, Arqueo de caja, Cuentas por cobrar y Gestión de Impuestos.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <PieChart size={16} /> Exportar Excel
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <FileText size={16} /> Reporte Z (Cierre)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#050505]">
        <div className="flex space-x-6">
          <button onClick={() => setActiveTab('pnl')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pnl' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Estado de Resultados (P&L)
          </button>
          <button onClick={() => setActiveTab('caja')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'caja' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Cierre de Caja
          </button>
          <button onClick={() => setActiveTab('cxc')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'cxc' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Cuentas por Cobrar (Fiados)
            <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-black px-1.5 py-0.5 rounded-full">3</span>
          </button>
          <button onClick={() => setActiveTab('cxp')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'cxp' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Proveedores e Impuestos
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#FBFBFB] dark:bg-[#020202]">
        
        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-400 font-medium">
            <RefreshCcw className="animate-spin mr-2" size={20} /> Sincronizando datos financieros...
          </div>
        ) : activeTab === 'pnl' ? (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Ingresos Brutos</h3>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-neutral-900 dark:text-white">${metrics?.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg dark:bg-emerald-900/30"><TrendingUp size={20} /></div>
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Gastos (Opex + COGS)</h3>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-neutral-900 dark:text-white">${metrics?.total_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <div className="bg-rose-50 text-rose-600 p-2 rounded-lg dark:bg-rose-900/30"><TrendingDown size={20} /></div>
                </div>
              </div>
              <div className="p-6 bg-indigo-600 border border-indigo-700 rounded-xl shadow-sm text-white">
                <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Utilidad Neta</h3>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black">${metrics?.net_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <DollarSign className="text-indigo-200" size={28} />
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Margen Bruto Total</h3>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{metrics?.profit_margin_percentage.toFixed(1)}%</span>
                  <PieChart className="text-neutral-300 dark:text-neutral-700" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                <FileText className="text-indigo-500" /> Desglose del Estado de Resultados (Este mes)
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">Ventas Brutas</span>
                  <span className="font-medium text-neutral-900 dark:text-white">${(metrics?.total_revenue || 0 + 500).toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm ml-4">(-) Devoluciones / Reembolsos</span>
                  <span className="font-medium text-rose-500">-$500.00</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] p-3 rounded-lg">
                  <span className="font-bold text-neutral-900 dark:text-white">Ingresos Netos</span>
                  <span className="font-bold text-neutral-900 dark:text-white">${metrics?.total_revenue.toLocaleString('en-US')}</span>
                </div>
                
                <div className="flex justify-between items-center pt-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm ml-4">(-) Costo de Bienes Vendidos (COGS)</span>
                  <span className="font-medium text-rose-500">-${(metrics?.total_expenses || 0 * 0.6).toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800 bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-lg">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">Margen Bruto</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">${(metrics?.net_profit || 0 + (metrics?.total_expenses || 0 * 0.4)).toLocaleString('en-US')}</span>
                </div>

                <div className="flex justify-between items-center pt-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm ml-4">(-) Gastos Operativos (Arriendo, Nómina, etc)</span>
                  <span className="font-medium text-rose-500">-${(metrics?.total_expenses || 0 * 0.4).toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">UTILIDAD NETA</span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">${metrics?.net_profit.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'caja' ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Lock className="text-indigo-500" /> Cierre de Turno / Arqueo de Caja
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">Declara los montos físicos para comparar con el sistema POS.</p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-2">Valores Físicos (Declarados)</h3>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Efectivo en gaveta</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                        <input type="number" placeholder="0.00" className="w-full pl-8 pr-4 py-2.5 text-lg font-bold bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Total Vouchers Tarjeta</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                        <input type="number" placeholder="0.00" className="w-full pl-8 pr-4 py-2.5 text-lg font-bold bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 bg-neutral-50 dark:bg-[#111111] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-2">Valores Sistema (Calculados)</h3>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-neutral-500">Ventas en Efectivo:</span>
                      <span className="text-neutral-900 dark:text-white">$4,520.00</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-neutral-500">Ventas con Tarjeta:</span>
                      <span className="text-neutral-900 dark:text-white">$2,100.00</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-neutral-500">Base inicial (Sencillo):</span>
                      <span className="text-neutral-900 dark:text-white">$1,000.00</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-4">
                      <span className="font-bold text-neutral-900 dark:text-white">Total Esperado:</span>
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">$7,620.00</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                    Estado: <span className="text-neutral-400 italic">Esperando valores declarados...</span>
                  </div>
                  <button className="bg-neutral-900 dark:bg-white text-white dark:text-black font-bold px-6 py-3 rounded-lg shadow-md hover:bg-neutral-800 transition-colors">
                    Realizar Cierre Definitivo
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'cxc' ? (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
               <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="text-rose-500" /> Cuentas por Cobrar (Fiados)
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">Gestión de cartera de pacientes y cobranza automática.</p>
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-6 py-4">Venta Ref.</th>
                    <th className="px-6 py-4 text-center">Días de Atraso</th>
                    <th className="px-6 py-4 text-right">Monto Adeudado</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">Carlos Martínez</td>
                    <td className="px-6 py-4 text-neutral-500 font-mono text-xs">POS-2026-992</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold px-2.5 py-1 rounded-full text-xs">45 días</span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-rose-600 dark:text-rose-400">$120,500</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-bold bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-1.5 shadow-sm hover:border-indigo-500 transition-colors">Abonar</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">Familia Gómez</td>
                    <td className="px-6 py-4 text-neutral-500 font-mono text-xs">POS-2026-104</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold px-2.5 py-1 rounded-full text-xs">12 días</span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-rose-600 dark:text-rose-400">$45,000</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-bold bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-1.5 shadow-sm hover:border-indigo-500 transition-colors">Abonar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'cxp' ? (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
               <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Building className="text-indigo-500" /> Cuentas por Pagar (Proveedores)
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">Pagos pendientes a distribuidores e inventario.</p>
                </div>
                <button className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-700 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">Registrar Factura Proveedor</button>
              </div>
              <div className="p-6 text-center text-neutral-500 text-sm font-medium">
                No hay facturas pendientes de pago en este momento.
              </div>
            </div>

            <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
               <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111]">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-emerald-500" /> Impuestos Calculados (DIAN)
                </h2>
                <p className="text-xs text-neutral-500 mt-1">IVA acumulado de ventas gravadas en el periodo actual.</p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-neutral-500 uppercase mb-1">IVA Generado (Ventas 19%)</p>
                  <p className="text-3xl font-black text-neutral-900 dark:text-white">$1,452,300.00</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-500 uppercase mb-1 text-right">Medicamentos Exentos (0%)</p>
                  <p className="text-3xl font-black text-neutral-900 dark:text-white text-right">$8,200,000.00</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
