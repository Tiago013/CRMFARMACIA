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
  
  const { user } = useAuthStore();
  const userRole = user?.role || 'admin';

  useEffect(() => {
    // Update URL when tab changes without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.pushState({}, '', url);
  }, [activeTab]);

  if (userRole !== 'admin' && userRole !== 'regente') {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        No tienes permisos para acceder a la configuración del sistema.
      </div>
    );
  }

  const handleSave = () => {
    toast.success('✅ Configuración actualizada exitosamente');
  };

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
          <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
            <Save size={16} /> Guardar Cambios
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
                    <input type="text" defaultValue="Salud Vital S.A.S." className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">NIT / RUT</label>
                    <input type="text" defaultValue="900.123.456-7" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Nombre Comercial</label>
                    <input type="text" defaultValue="Droguería Salud Vital" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Régimen Tributario</label>
                    <select className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white">
                      <option>Responsable de IVA (Común)</option>
                      <option>No Responsable (Simplificado)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Resolución DIAN</label>
                    <input type="text" defaultValue="187620000001 - Rango: FE-1 a FE-10000" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Teléfono Fijo / Celular</label>
                    <input type="text" defaultValue="+57 300 123 4567" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Email Oficial</label>
                    <input type="email" defaultValue="admin@saludvital.com" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Dirección Principal</label>
                    <input type="text" defaultValue="Calle 123 #45-67, Bogotá, Cundinamarca" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 text-neutral-900 dark:text-white" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Logotipo y Marca</h2>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">SV</div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-3 max-w-sm">Recomendado: PNG transparente, máx 2MB. Se usará en recibos y facturas.</p>
                    <button className="flex items-center gap-2 bg-white dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 px-4 py-2 rounded-md text-sm font-semibold transition-colors">
                      <Upload size={16} /> Cambiar Logo
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
                    <tr className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                      <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white flex items-center gap-2"><UserCircle size={18}/> Admin Principal</td>
                      <td className="px-6 py-4 text-neutral-500">admin@saludvital.com</td>
                      <td className="px-6 py-4"><span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded text-xs font-bold">Administrador</span></td>
                      <td className="px-6 py-4 text-right">🟢 Activo</td>
                    </tr>
                    <tr className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                      <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white flex items-center gap-2"><UserCircle size={18}/> María López</td>
                      <td className="px-6 py-4 text-neutral-500">mlopez@saludvital.com</td>
                      <td className="px-6 py-4"><span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">Regente</span></td>
                      <td className="px-6 py-4 text-right">🟢 Activo</td>
                    </tr>
                    <tr className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
                      <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white flex items-center gap-2"><UserCircle size={18}/> Carlos Díaz</td>
                      <td className="px-6 py-4 text-neutral-500">carlos@saludvital.com</td>
                      <td className="px-6 py-4"><span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold">Cajero</span></td>
                      <td className="px-6 py-4 text-right text-neutral-400">🔴 Inactivo</td>
                    </tr>
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
                  <SettingToggle title="Registro de Paciente Obligatorio" desc="Exige asignar un paciente antes de cerrar cualquier venta en el POS." defaultOn={true} />
                  <SettingToggle title="Permitir Ventas a Fiado" desc="Habilita la opción de cobrar facturas a crédito para pacientes de confianza." defaultOn={true} />
                  <SettingToggle title="Impresión Automática" desc="Envía la orden a la impresora térmica automáticamente tras el pago." defaultOn={true} />
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Monto máximo de fiado</label>
                      <input type="number" defaultValue="200000" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Descuento máximo en caja</label>
                      <select className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500">
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
                      <SettingToggle title="Incluir Logo en impresión" desc="Si tu impresora soporta gráficos." defaultOn={true} compact />
                      <SettingToggle title="Mostrar Desglose de IVA" desc="Exigido por la DIAN." defaultOn={true} compact />
                      <SettingToggle title="Ocultar Cédula del Cajero" desc="" defaultOn={false} compact />
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
                  <SettingToggle title="FEFO Obligatorio" desc="First Expired, First Out. Exige vender el lote más próximo a vencer primero." defaultOn={true} />
                  <SettingToggle title="Bloquear Venta de Vencidos" desc="Impide facturar un producto si su lote activo está expirado." defaultOn={true} />
                  <SettingToggle title="Permitir Stock Negativo" desc="Permite facturar productos aunque el sistema indique stock 0 (Genera inconsistencias)." defaultOn={false} />
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Días de alerta de Vencimiento</label>
                      <select className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500">
                        <option>30 días</option>
                        <option>60 días (Recomendado)</option>
                        <option>90 días</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Stock Mínimo Default</label>
                      <input type="number" defaultValue="5" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" />
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
                <SettingToggle title="Consentimiento Obligatorio" desc="Requerir que el paciente acepte la política de datos antes de registrar su teléfono/email." defaultOn={true} />
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
                    <input type="number" defaultValue="500000" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-500 mb-1">Segmento VIP (Monto &gt;)</label>
                    <input type="number" defaultValue="2000000" className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" />
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
                    <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400">&quot;Hola &#123;nombre&#125;, tu &#123;medicamento&#125; se agota en &#123;dias&#125; días. ¿Deseas que te lo reservemos?&quot;</p>
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
                      <MatrixRow title="Stock Bajo Crítico" app={true} email={true} wa={false} />
                      <MatrixRow title="Lote por Vencer" app={true} email={true} wa={false} />
                      <MatrixRow title="Refill de Paciente" app={true} email={false} wa={true} />
                      <MatrixRow title="Cierre de Caja Pendiente" app={true} email={true} wa={false} />
                      <MatrixRow title="Venta Sospechosa (> 1M)" app={true} email={true} wa={true} />
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
                  <SettingToggle title="Autenticación de 2 Factores (2FA)" desc="Exige código temporal desde Google Authenticator para todos los administradores." defaultOn={true} />
                  <SettingToggle title="Bloqueo por IP (Whitelist)" desc="Solo permitir acceso desde la red WiFi de la farmacia." defaultOn={false} />
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Timeout de Sesión</label>
                      <select className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500">
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
                  <button className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm border border-neutral-300 dark:border-neutral-700">
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
                      <div className="font-mono text-sm">sk_live_...9f2a</div>
                      <div className="text-xs text-neutral-500 mt-1">Integración Alegra Contabilidad</div>
                    </div>
                    <button className="text-red-500 text-xs font-bold">Revocar</button>
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
                    <select className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option>Sincronizar con Sistema (Default)</option>
                      <option>Claro</option>
                      <option>Oscuro (Modo Noche)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Densidad de Interfaz</label>
                    <select className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option>Normal (Recomendado)</option>
                      <option>Compacta (Más datos por pantalla)</option>
                      <option>Cómoda (Para pantallas táctiles)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Moneda y Formato</label>
                    <select className="w-full bg-white dark:bg-[#111111] border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500">
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

function SettingToggle({ title, desc, defaultOn, compact = false }: { title: string, desc: string, defaultOn: boolean, compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      <div>
        <h4 className={`font-bold text-neutral-900 dark:text-white ${compact ? 'text-xs' : 'text-sm'}`}>{title}</h4>
        {desc && <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" className="sr-only peer" defaultChecked={defaultOn} />
        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );
}

function MatrixRow({ title, app, email, wa }: { title: string, app: boolean, email: boolean, wa: boolean }) {
  return (
    <tr className="hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors">
      <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-white">{title}</td>
      <td className="px-6 py-4 text-center">
        <input type="checkbox" defaultChecked={app} className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" />
      </td>
      <td className="px-6 py-4 text-center">
        <input type="checkbox" defaultChecked={email} className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" />
      </td>
      <td className="px-6 py-4 text-center">
        <input type="checkbox" defaultChecked={wa} className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" />
      </td>
    </tr>
  );
}
