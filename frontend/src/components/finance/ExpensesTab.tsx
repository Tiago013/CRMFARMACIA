'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Filter, FileText, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function ExpensesTab({ period = '7d' }: { period?: string }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ amount: '', category_id: '', date: new Date().toISOString().split('T')[0], description: '', reference_code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`/api/finance/expenses?period=${period}`);
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error('API Error:', data);
        setExpenses([]);
        return;
      }
      setExpenses(data);
    } catch (e) { console.error(e); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/finance/expense-categories');
      const data = await res.json();
      
      if (!Array.isArray(data)) {
        console.error('API Error:', data);
        setCategories([{ id: 'mock-1', name: 'Arriendo', color: '#6366f1' }, { id: 'mock-2', name: 'Nómina', color: '#10b981' }]);
        return;
      }

      if (data.length === 0) {
        setCategories([{ id: 'mock-1', name: 'Arriendo', color: '#6366f1' }, { id: 'mock-2', name: 'Nómina', color: '#10b981' }]);
      } else {
        setCategories(data);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    Promise.all([fetchExpenses(), fetchCategories()]).finally(() => setLoading(false));
  }, [period]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ amount: '', category_id: '', date: new Date().toISOString().split('T')[0], description: '', reference_code: '' });
      fetchExpenses();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Group by category for PieChart
  const categoryData = categories.map(cat => ({
    name: cat.name,
    value: expenses.filter(e => e.category_id === cat.id || (e.category && e.category.id === cat.id)).reduce((sum, e) => sum + e.amount, 0),
    color: cat.color
  })).filter(cat => cat.value > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header & KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Gastos (Mes)</p>
            <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400">
              ${totalExpenses.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </h3>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
            <DollarSign size={24} />
          </div>
        </div>
        
        <div className="md:col-span-2 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Control de Gastos Operativos</h3>
            <p className="text-indigo-100 text-sm max-w-md">Registra y monitorea arriendos, nómina, servicios y otros OPEX para obtener un Estado de Resultados preciso.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-white text-indigo-600 px-5 py-3 rounded-lg font-bold text-sm shadow-sm hover:bg-neutral-50 flex items-center gap-2 transition-transform active:scale-95">
            <Plus size={18} /> Registrar Gasto
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm lg:col-span-1">
          <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
            <PieChartIcon size={16} className="text-indigo-500" /> Distribución por Categoría
          </h4>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString('es-CO')}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm">Sin datos para graficar</div>
            )}
          </div>
        </div>

        {/* Expense List */}
        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <FileText size={16} className="text-emerald-500" /> Historial Reciente
            </h4>
            <button className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
              <Filter size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white dark:bg-[#0A0A0A] sticky top-0 border-b border-neutral-200 dark:border-neutral-800">
                <tr className="text-xs font-bold text-neutral-500 uppercase">
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3">Descripción</th>
                  <th className="px-6 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">Cargando...</td></tr>
                ) : expenses.length > 0 ? (
                  expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                      <td className="px-6 py-3 font-medium text-neutral-900 dark:text-white">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-neutral-200 dark:border-neutral-800" style={{ color: exp.category?.color || '#666', backgroundColor: `${exp.category?.color || '#666'}1A` }}>
                          {exp.category?.name || 'Desconocida'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-neutral-500">{exp.description || '-'}</td>
                      <td className="px-6 py-3 text-right font-black text-rose-600 dark:text-rose-400">
                        ${exp.amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No se han registrado gastos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Registro Gasto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111111] rounded-2xl w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#0A0A0A]">
              <h3 className="font-bold text-neutral-900 dark:text-white">Registrar Nuevo Gasto</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Monto del Gasto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full pl-8 pr-4 py-2 bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500 font-bold" placeholder="0" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Categoría *</label>
                <select required value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500">
                  <option value="">Seleccione una categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Fecha *</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Descripción</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500" placeholder="Ej: Pago arriendo local principal" />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Código de Referencia / Factura</label>
                <input type="text" value={formData.reference_code} onChange={e => setFormData({...formData, reference_code: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-500" placeholder="Ej: FAC-10294" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-neutral-500 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
