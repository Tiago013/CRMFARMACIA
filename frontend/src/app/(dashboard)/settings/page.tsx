'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Receipt, Bell, ShieldAlert, Database, 
  Save, Download, CheckCircle, Upload, Shield, MapPin, Search,
  Box, UserCircle, MessageSquare, Lock, Link as LinkIcon, Palette
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'pharmacy';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const [settings, setSettings] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const userRole = user?.role || 'admin';

  useEffect(() => {
    // Update URL when tab changes without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.pushState({}, '', url);
  }, [activeTab]);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'regente') {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.settings) {
            setSettings(data.settings);
          }
          if (data.users) {
            setUsers(data.users);
          }
        })
        .catch(err => console.error("Error fetching settings", err))
        .finally(() => setLoading(false));
    }
  }, [userRole]);

  if (userRole !== 'admin' && userRole !== 'regente') {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        No tienes permisos para acceder a la configuración del sistema.
      </div>
    );
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to update settings');
      toast.success('✅ Configuración actualizada exitosamente');
    } catch (error) {
      toast.error('❌ Error al actualizar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleExportAudit = () => {
    window.location.href = '/api/audit/export';
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo de 2MB');
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        handleSettingChange('logo_url', data.url);
        toast.success('Logo subido correctamente (No olvides guardar los cambios)');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000000]">
      {/* Header Premium */}
      <div className="flex justify-between items-end px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Configuración de Plataforma
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Personaliza y adapta FarmaAI Enterprise a las reglas de tu negocio.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={16} />}
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Settings Navigation */}
        <div className="w-64 bg-[#FBFBFB] dark:bg-[#050505] border-r border-neutral-200 dark:border-neutral-800 p-4 space-y-1 overflow-y-auto shrink-0">
          
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-2 mt-2">Negocio</div>
          <TabButton id="pharmacy" icon={<Building2 size={16} />} label="Perfil de Farmacia" active={activeTab === 'pharmacy'} onClick={() => setActiveTab('pharmacy')} />
          <TabButton id="team" icon={<Users size={16} />} label="Equipo y Usuarios" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
          <TabButton id="pos" icon={<Receipt size={16} />} label="POS y Ventas" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
          <TabButton id="inventory" icon={<Box size={16} />} label="Inventario" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <TabButton id="crm" icon={<UserCircle size={16} />} label="CRM y Pacientes" active={activeTab === 'crm'} onClick={() => setActiveTab('crm')} />

          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-2 mt-6">Operativa</div>
          <TabButton id="communications" icon={<MessageSquare size={16} />} label="Comunicaciones" active={activeTab === 'communications'} onClick={() => setActiveTab('communications')} />
          <TabButton id="notifications" icon={<Bell size={16} />} label="Notificaciones" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
          
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-2 mt-6">Sistema & Datos</div>
          <TabButton id="security" icon={<Lock size={16} />} label="Seguridad & Audit" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
          <TabButton id="integrations" icon={<LinkIcon size={16} />} label="Integraciones (API)" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
          <TabButton id="appearance" icon={<Palette size={16} />} label="Apariencia & UX" active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} />
        </div>

        {/* Setting Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#FDFDFD] dark:bg-[#020202]">
          
          {/* 28.2 Perfil de Farmacia */}
          {activeTab === 'pharmacy' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Información Legal y Comercial</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Razón Social</label>
                    <input type="text" value={settings.pharmacy_name || ''} onChange={(e) => handleSettingChange('pharmacy_name', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">NIT / RUT</label>
                    <input type="text" value={settings.pharmacy_tax_id || ''} onChange={(e) => handleSettingChange('pharmacy_tax_id', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Nombre Comercial</label>
                    <input type="text" value={settings.pharmacy_commercial_name || ''} onChange={(e) => handleSettingChange('pharmacy_commercial_name', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Régimen Tributario</label>
                    <select value={settings.pharmacy_tax_regime || 'Responsable de IVA (Común)'} onChange={(e) => handleSettingChange('pharmacy_tax_regime', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white">
                      <option>Responsable de IVA (Común)</option>
                      <option>No Responsable (Simplificado)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Resolución DIAN</label>
                    <input type="text" value={settings.pharmacy_dian_resolution || ''} onChange={(e) => handleSettingChange('pharmacy_dian_resolution', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Teléfono Fijo / Celular</label>
                    <input type="text" value={settings.pharmacy_phone || ''} onChange={(e) => handleSettingChange('pharmacy_phone', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Email Oficial</label>
                    <input type="email" value={settings.pharmacy_email || ''} onChange={(e) => handleSettingChange('pharmacy_email', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Dirección Principal</label>
                    <input type="text" value={settings.pharmacy_address || ''} onChange={(e) => handleSettingChange('pharmacy_address', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Logotipo y Marca</h2>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo Farmacia" className="w-full h-full object-contain bg-white" />
                    ) : (
                      <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                        {settings.pharmacy_name ? settings.pharmacy_name.substring(0, 2).toUpperCase() : 'SV'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-3 max-w-sm">Recomendado: PNG transparente, máx 2MB. Se usará en recibos y facturas.</p>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg" 
                      ref={fileInputRef} 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-2 bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {uploadingLogo ? (
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Upload size={16} /> 
                      )}
                      {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 28.3 Equipo y Usuarios */}
          {activeTab === 'team' && (
             <div className="max-w-4xl space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Equipo y Usuarios</h2>
                  <p className="text-sm text-neutral-500">4 / 10 usuarios activos de tu plan PRO.</p>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">Invitar Usuario</button>
              </div>
              
              <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                 <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Nombre</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Rol</th>
                      <th className="px-6 py-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                        <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white flex items-center gap-2"><UserCircle size={18}/> {u.first_name} {u.last_name}</td>
                        <td className="px-6 py-4 text-neutral-500">ID: {u.auth_id.substring(0, 8)}...</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                            u.role === 'regente' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">🟢 Activo</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 28.4 POS y Ventas */}
          {activeTab === 'pos' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Operación del Punto de Venta</h2>
                <div className="space-y-4">
                  <SettingToggle title="Registro de Paciente Obligatorio" desc="Exige asignar un paciente antes de cerrar cualquier venta en el POS." checked={settings.pos_require_patient ?? true} onChange={(val) => handleSettingChange('pos_require_patient', val)} />
                  <SettingToggle title="Permitir Ventas a Fiado" desc="Habilita la opción de cobrar facturas a crédito para pacientes de confianza." checked={settings.pos_allow_credit ?? true} onChange={(val) => handleSettingChange('pos_allow_credit', val)} />
                  <SettingToggle title="Impresión Automática" desc="Envía la orden a la impresora térmica automáticamente tras el pago." checked={settings.pos_auto_print ?? true} onChange={(val) => handleSettingChange('pos_auto_print', val)} />
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Monto máximo de fiado</label>
                      <input type="number" value={settings.pos_max_credit || 200000} onChange={(e) => handleSettingChange('pos_max_credit', Number(e.target.value))} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Descuento máximo en caja</label>
                      <select value={settings.pos_max_discount || '10%'} onChange={(e) => handleSettingChange('pos_max_discount', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500">
                        <option>10%</option>
                        <option>15%</option>
                        <option>Sin Límite (Solo Admin)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Apariencia del Recibo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Mensaje de Despedida</label>
                    <textarea rows={3} defaultValue="¡Gracias por su compra! Conserve este recibo. Devoluciones hasta en 5 días." className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md p-3 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white"></textarea>
                    
                    <div className="mt-4 space-y-3">
                      <SettingToggle title="Incluir Logo en impresión" desc="Si tu impresora soporta gráficos." checked={settings.receipt_logo ?? true} onChange={(val) => handleSettingChange('receipt_logo', val)} compact />
                      <SettingToggle title="Mostrar Desglose de IVA" desc="Exigido por la DIAN." checked={settings.receipt_tax ?? true} onChange={(val) => handleSettingChange('receipt_tax', val)} compact />
                      <SettingToggle title="Ocultar Cédula del Cajero" desc="" checked={settings.receipt_hide_cashier ?? false} onChange={(val) => handleSettingChange('receipt_hide_cashier', val)} compact />
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 flex items-center justify-center">
                    {/* Mock Receipt */}
                    <div className="bg-white w-48 shadow text-center p-4 text-[10px] font-mono text-black">
                      <div className="font-bold text-sm mb-1">SALUD VITAL SAS</div>
                      <div>NIT: 900.123.456-7</div>
                      <div>Calle 123 #45-67</div>
                      <div className="my-2 border-b border-dashed border-gray-400"></div>
                      <div className="flex justify-between"><span>ASPIRINA</span><span>$2,500</span></div>
                      <div className="flex justify-between font-bold mt-2 text-xs"><span>TOTAL</span><span>$2,500</span></div>
                      <div className="my-2 border-b border-dashed border-gray-400"></div>
                      <div className="text-[9px] mt-2">¡Gracias por su compra! Conserve este recibo. Devoluciones hasta en 5 días.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 28.5 Inventario */}
          {activeTab === 'inventory' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Reglas de Inventario</h2>
                <div className="space-y-4">
                  <SettingToggle title="FEFO Obligatorio" desc="First Expired, First Out. Exige vender el lote más próximo a vencer primero." checked={settings.inv_fefo ?? true} onChange={(val) => handleSettingChange('inv_fefo', val)} />
                  <SettingToggle title="Bloquear Venta de Vencidos" desc="Impide facturar un producto si su lote activo está expirado." checked={settings.inv_block_expired ?? true} onChange={(val) => handleSettingChange('inv_block_expired', val)} />
                  <SettingToggle title="Permitir Stock Negativo" desc="Permite facturar productos aunque el sistema indique stock 0 (Genera inconsistencias)." checked={settings.inv_allow_negative ?? false} onChange={(val) => handleSettingChange('inv_allow_negative', val)} />
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Días de alerta de Vencimiento</label>
                      <select value={settings.inv_expiration_days || '60 días (Recomendado)'} onChange={(e) => handleSettingChange('inv_expiration_days', e.target.value)} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500">
                        <option>30 días</option>
                        <option>60 días (Recomendado)</option>
                        <option>90 días</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Stock Mínimo Default</label>
                      <input type="number" value={settings.inv_min_stock ?? 5} onChange={(e) => handleSettingChange('inv_min_stock', Number(e.target.value))} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 28.6 CRM */}
          {activeTab === 'crm' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Habeas Data & Privacidad</h2>
                <SettingToggle title="Consentimiento Obligatorio" desc="Requerir que el paciente acepte la política de datos antes de registrar su teléfono/email." checked={settings.crm_require_consent ?? true} onChange={(val) => handleSettingChange('crm_require_consent', val)} />
                <div className="mt-4">
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Texto Legal (Ley 1581)</label>
                  <textarea rows={3} defaultValue="Autorizo a Salud Vital S.A.S. al tratamiento de mis datos para envío de facturas y recordatorios médicos." className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md p-3 text-sm outline-none focus:border-indigo-500"></textarea>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Segmentación LTV (Life Time Value)</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-amber-500 mb-1">Segmento PREMIUM (Monto &gt;)</label>
                    <input type="number" value={settings.crm_premium_threshold || 500000} onChange={(e) => handleSettingChange('crm_premium_threshold', Number(e.target.value))} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-500 mb-1">Segmento VIP (Monto &gt;)</label>
                    <input type="number" value={settings.crm_vip_threshold || 2000000} onChange={(e) => handleSettingChange('crm_vip_threshold', Number(e.target.value))} className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 28.7 Communications */}
          {activeTab === 'communications' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">WhatsApp Business API</h2>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <div>
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-400 text-sm">Conectado Exitosamente</h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-500">Número: +57 300 123 4567</p>
                    </div>
                  </div>
                  <button className="text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline">Desconectar</button>
                </div>
                
                <div className="space-y-4 mt-6">
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Templates Automáticos</label>
                  <div className="p-4 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg">
                    <h5 className="font-bold text-sm mb-2 text-indigo-600">Refill Reminder</h5>
                    <textarea 
                      rows={2} 
                      className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md p-2 text-xs font-mono text-neutral-600 dark:text-neutral-400 outline-none focus:border-indigo-500"
                      value={settings.whatsapp_refill_template || "Hola {nombre}, tu {medicamento} se agota en {dias} días. ¿Deseas que te lo reservemos?"}
                      onChange={(e) => handleSettingChange('whatsapp_refill_template', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 28.8 Notifications */}
          {activeTab === 'notifications' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Matriz de Notificaciones</h2>
                <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111] text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        <th className="px-6 py-3">Evento</th>
                        <th className="px-6 py-3 text-center">App</th>
                        <th className="px-6 py-3 text-center">Email</th>
                        <th className="px-6 py-3 text-center">WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      <MatrixRow title="Stock Bajo Crítico" app={settings.notif_stock_app ?? true} email={settings.notif_stock_email ?? true} wa={settings.notif_stock_wa ?? false} onChange={(key, val) => handleSettingChange(`notif_stock_${key}`, val)} />
                      <MatrixRow title="Lote por Vencer" app={settings.notif_exp_app ?? true} email={settings.notif_exp_email ?? true} wa={settings.notif_exp_wa ?? false} onChange={(key, val) => handleSettingChange(`notif_exp_${key}`, val)} />
                      <MatrixRow title="Refill de Paciente" app={settings.notif_refill_app ?? true} email={settings.notif_refill_email ?? false} wa={settings.notif_refill_wa ?? true} onChange={(key, val) => handleSettingChange(`notif_refill_${key}`, val)} />
                      <MatrixRow title="Cierre de Caja Pendiente" app={settings.notif_till_app ?? true} email={settings.notif_till_email ?? true} wa={settings.notif_till_wa ?? false} onChange={(key, val) => handleSettingChange(`notif_till_${key}`, val)} />
                      <MatrixRow title="Venta Sospechosa (> 1M)" app={settings.notif_sus_app ?? true} email={settings.notif_sus_email ?? true} wa={settings.notif_sus_wa ?? true} onChange={(key, val) => handleSettingChange(`notif_sus_${key}`, val)} />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 28.9 Security */}
          {activeTab === 'security' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Seguridad y Acceso</h2>
                <div className="space-y-4">
                  <SettingToggle title="Autenticación de 2 Factores (2FA)" desc="Exige código temporal desde Google Authenticator para todos los administradores." checked={settings.require_2fa ?? true} onChange={(val) => handleSettingChange('require_2fa', val)} />
                  <SettingToggle title="Bloqueo por IP (Whitelist)" desc="Solo permitir acceso desde la red WiFi de la farmacia." checked={settings.ip_whitelist ?? false} onChange={(val) => handleSettingChange('ip_whitelist', val)} />
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Timeout de Sesión</label>
                      <select 
                        className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        value={settings.session_timeout || '1 Hora'}
                        onChange={(e) => handleSettingChange('session_timeout', e.target.value)}
                      >
                        <option>1 Hora</option>
                        <option>4 Horas</option>
                        <option>12 Horas</option>
                        <option>Nunca (No recomendado)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Audit Trail (Trazabilidad Inmutable)</h2>
                <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                  <p className="text-sm text-neutral-500 mb-4">FarmaAI guarda un registro encriptado de cada venta, ajuste de stock y acceso. Para revisar auditorías, utiliza la herramienta de exportación.</p>
                  <button onClick={handleExportAudit} className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm border border-neutral-300 dark:border-neutral-700">
                    <Download size={16} /> Exportar Log de Auditoría Completo (CSV)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 28.10 Integrations */}
          {activeTab === 'integrations' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Webhooks & API Keys</h2>
                <p className="text-sm text-neutral-500 mb-4">Conecta FarmaAI con tus sistemas ERP o contables externos.</p>
                <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Keys Activas</h3>
                    <button className="text-indigo-600 font-bold text-sm">Generar Nueva Key</button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-[#111111] rounded border border-neutral-200 dark:border-neutral-800">
                    <div>
                      <div className="font-mono text-sm">{settings.api_key_alegra || 'sk_live_...9f2a'}</div>
                      <div className="text-xs text-neutral-500 mt-1">Integración Alegra Contabilidad</div>
                    </div>
                    <button className="text-red-500 text-xs font-bold" onClick={() => handleSettingChange('api_key_alegra', null)}>Revocar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 28.11 Appearance */}
          {activeTab === 'appearance' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Apariencia y UX</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Tema Visual</label>
                    <select 
                      className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      value={settings.theme || 'Sincronizar con Sistema (Default)'}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                    >
                      <option>Sincronizar con Sistema (Default)</option>
                      <option>Claro</option>
                      <option>Oscuro (Modo Noche)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Densidad de Interfaz</label>
                    <select 
                      className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      value={settings.density || 'Normal (Recomendado)'}
                      onChange={(e) => handleSettingChange('density', e.target.value)}
                    >
                      <option>Normal (Recomendado)</option>
                      <option>Compacta (Más datos por pantalla)</option>
                      <option>Cómoda (Para pantallas táctiles)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Moneda y Formato</label>
                    <select 
                      className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      value={settings.currency || 'COP - Peso Colombiano ($1.234.567)'}
                      onChange={(e) => handleSettingChange('currency', e.target.value)}
                    >
                      <option>COP - Peso Colombiano ($1.234.567)</option>
                      <option>USD - US Dollar ($1,234,567.00)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function TabButton({ id, icon, label, active, onClick }: { id: string, icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
        active 
          ? 'bg-neutral-200/50 dark:bg-[#111111] text-indigo-600 dark:text-indigo-400 shadow-sm' 
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#111111] hover:text-neutral-900 dark:hover:text-white'
      }`}
    >
      <span className={`${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}`}>{icon}</span>
      {label}
    </button>
  );
}

function SettingToggle({ title, desc, checked, onChange, compact = false }: { title: string, desc: string, checked: boolean, onChange: (val: boolean) => void, compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      <div>
        <h4 className={`font-bold text-neutral-900 dark:text-white ${compact ? 'text-xs' : 'text-sm'}`}>{title}</h4>
        {desc && <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );
}

function MatrixRow({ title, app, email, wa, onChange }: { title: string, app: boolean, email: boolean, wa: boolean, onChange: (key: 'app'|'email'|'wa', val: boolean) => void }) {
  return (
    <tr className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
      <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-white">{title}</td>
      <td className="px-6 py-4 text-center">
        <input type="checkbox" checked={app} onChange={(e) => onChange('app', e.target.checked)} className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" />
      </td>
      <td className="px-6 py-4 text-center">
        <input type="checkbox" checked={email} onChange={(e) => onChange('email', e.target.checked)} className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" />
      </td>
      <td className="px-6 py-4 text-center">
        <input type="checkbox" checked={wa} onChange={(e) => onChange('wa', e.target.checked)} className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" />
      </td>
    </tr>
  );
}
