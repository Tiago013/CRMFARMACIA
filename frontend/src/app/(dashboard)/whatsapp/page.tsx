'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, QrCode, Send, RefreshCcw, Power, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import PremiumGuard from '@/components/PremiumGuard';

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState('connection');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('El microservicio no está corriendo', e);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    const res = await fetch('/api/whatsapp/templates');
    if (res.ok) {
      setTemplates(await res.json());
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchTemplates();
    
    // Poll status every 5 seconds if not connected
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) return;
    
    // count variables (e.g. {{1}})
    const matches = newTemplate.content.match(/\{\{\d+\}\}/g);
    const variables = matches ? matches.length : 0;

    await fetch('/api/whatsapp/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTemplate, variables })
    });
    setNewTemplate({ name: '', content: '' });
    fetchTemplates();
  };

  const handleDeleteTemplate = async (id: string) => {
    await fetch(`/api/whatsapp/templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/logout', { method: 'POST' });
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PremiumGuard featureName="WhatsApp Marketing" requiredPlan="PRO">
      <div className="flex flex-col h-full bg-[#FBFBFB] dark:bg-[#0A0A0A]">
        <div className="flex justify-between items-end px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000]">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="text-emerald-500" /> WhatsApp Pro (Local)
            </h1>
            <p className="text-neutral-500 text-sm mt-1">Conecta tu WhatsApp vía Código QR y automatiza tus mensajes gratis.</p>
          </div>
        </div>

      {/* Tabs */}
      <div className="px-8 border-b border-neutral-200 dark:border-neutral-800 bg-[#FDFDFD] dark:bg-[#050505]">
        <div className="flex space-x-6">
          <button onClick={() => setActiveTab('connection')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'connection' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Conexión Dispositivo
          </button>
          <button onClick={() => setActiveTab('templates')} className={`pb-3 pt-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'templates' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            Plantillas de Mensajes
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'connection' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {!status ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-start gap-4">
                <Power className="shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Microservicio Apagado</h3>
                  <p className="text-sm">FarmaAI no detecta el motor de WhatsApp. Para usar esta función gratuita, debes iniciar el microservicio corriendo <code className="bg-rose-100 px-2 py-0.5 rounded font-mono text-xs">npm run whatsapp</code> en tu terminal de servidor.</p>
                </div>
              </div>
            ) : status.isConnected ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 p-8 rounded-xl flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={40} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-bold text-2xl mb-2 text-emerald-800 dark:text-emerald-300">¡Conectado Exitosamente!</h3>
                <p className="mb-6">Tu WhatsApp está enlazado a FarmaAI. Se están procesando mensajes desde la cuenta <strong>{status.phone}</strong>.</p>
                <button onClick={handleLogout} className="bg-white dark:bg-black border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors">
                  Cerrar Sesión y Desvincular
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 p-8 rounded-xl flex flex-col md:flex-row items-center gap-10 shadow-sm">
                <div className="flex-1">
                  <h3 className="font-bold text-2xl mb-4 text-neutral-900 dark:text-white">Escanea el Código QR</h3>
                  <ol className="list-decimal pl-5 space-y-3 text-neutral-600 dark:text-neutral-400">
                    <li>Abre WhatsApp en tu teléfono celular.</li>
                    <li>Toca <strong>Menú</strong> (3 puntos) o <strong>Configuración</strong> y selecciona <strong>Dispositivos vinculados</strong>.</li>
                    <li>Toca <strong>Vincular un dispositivo</strong>.</li>
                    <li>Apunta tu teléfono a esta pantalla para escanear el código QR.</li>
                  </ol>
                </div>
                <div className="shrink-0 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                  {status.qrCode ? (
                    <img src={status.qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                  ) : (
                    <div className="w-64 h-64 bg-neutral-100 flex flex-col items-center justify-center text-neutral-400">
                      <RefreshCcw className="animate-spin mb-4" />
                      <span className="text-sm font-medium">Generando QR seguro...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 p-5 rounded-xl shadow-sm">
                <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Nueva Plantilla</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-500 mb-1 block">Nombre Identificador</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Recibo de Venta"
                      className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-500 mb-1 block">Contenido (Usa {'{{1}}'}, {'{{2}}'} para variables)</label>
                    <textarea 
                      rows={5}
                      placeholder="Hola {{1}}, gracias por tu compra. Tu total es {{2}}."
                      className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm resize-none"
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                    />
                  </div>
                  <button onClick={handleCreateTemplate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                    <Plus size={16} /> Crear Plantilla
                  </button>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              {templates.map(tpl => (
                <div key={tpl.id} className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 p-5 rounded-xl shadow-sm flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-neutral-900 dark:text-white">{tpl.name}</h4>
                      <span className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 text-[10px] px-2 py-0.5 rounded font-mono">{tpl.variables} variables</span>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{tpl.content}</p>
                  </div>
                  <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-10 text-neutral-500">No tienes plantillas creadas.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </PremiumGuard>
  );
}
