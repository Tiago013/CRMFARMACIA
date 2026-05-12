'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Truck, FileText, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
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

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get('/finance/metrics');
        setMetrics(response.data);
      } catch (error) {
        console.error("Error fetching financial metrics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000000] p-8 overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Finanzas y Compras</h1>
          <p className="text-neutral-500 text-sm mt-1">Control de márgenes, proveedores y flujo de caja.</p>
        </div>
        <button className="flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-neutral-800 dark:hover:bg-neutral-200">
          <FileText size={16} />
          <span>Generar Reporte Z (Cierre)</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <RefreshCcw className="animate-spin mr-2" size={20} /> Cargando métricas financieras...
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-5 bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-500 mb-2">Ingresos Totales</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">${metrics.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
          </div>
          <div className="p-5 bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-500 mb-2">Gastos Operativos (Opex)</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">${metrics.total_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <TrendingDown className="text-rose-500" size={20} />
            </div>
          </div>
          <div className="p-5 bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-500 mb-2">Utilidad Neta</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${metrics.net_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <DollarSign className="text-emerald-500" size={20} />
            </div>
          </div>
          <div className="p-5 bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-500 mb-2">Margen Bruto</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">{metrics.profit_margin_percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Orders */}
        <div className="bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg flex flex-col">
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Truck size={18} /> Órdenes de Compra (POs)
            </h3>
            <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Nueva Orden</button>
          </div>
          <div className="p-5">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="pb-3 font-medium">PO ID</th>
                  <th className="pb-3 font-medium">Proveedor</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                <tr>
                  <td className="py-3 font-medium text-neutral-900 dark:text-white">PO-1A2B3C</td>
                  <td className="py-3 text-neutral-600 dark:text-neutral-400">Bayer S.A.</td>
                  <td className="py-3"><span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500">Pendiente</span></td>
                  <td className="py-3 text-neutral-900 dark:text-white">$1,250.00</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium text-neutral-900 dark:text-white">PO-9F8E7D</td>
                  <td className="py-3 text-neutral-600 dark:text-neutral-400">Pfizer</td>
                  <td className="py-3"><span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-500">Recibido</span></td>
                  <td className="py-3 text-neutral-900 dark:text-white">$3,400.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Tracking */}
        <div className="bg-[#FDFDFD] dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg flex flex-col">
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <DollarSign size={18} /> Gastos Operativos
            </h3>
            <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Registrar Gasto</button>
          </div>
          <div className="p-5">
             <table className="w-full text-left text-sm">
              <thead className="text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="pb-3 font-medium">Categoría</th>
                  <th className="pb-3 font-medium">Descripción</th>
                  <th className="pb-3 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                <tr>
                  <td className="py-3 font-medium text-neutral-900 dark:text-white">Servicios</td>
                  <td className="py-3 text-neutral-600 dark:text-neutral-400">Factura Electricidad Mayo</td>
                  <td className="py-3 text-right text-rose-500 font-medium">-$150.00</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium text-neutral-900 dark:text-white">Nómina</td>
                  <td className="py-3 text-neutral-600 dark:text-neutral-400">Anticipo Cajero</td>
                  <td className="py-3 text-right text-rose-500 font-medium">-$200.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
