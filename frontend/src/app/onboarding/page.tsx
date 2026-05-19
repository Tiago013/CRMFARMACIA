'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Package, Settings, MessageCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { user } = useAuthStore();

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
    else router.push('/dashboard');
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const steps = [
    { id: 1, title: 'Datos de Farmacia', icon: Building2 },
    { id: 2, title: 'Crear Equipo', icon: Users },
    { id: 3, title: 'Inventario Inicial', icon: Package },
    { id: 4, title: 'Configurar POS', icon: Settings },
    { id: 5, title: 'Conectar WhatsApp', icon: MessageCircle },
    { id: 6, title: 'Finalizar', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      
      {/* Wizard Container */}
      <div className="w-full max-w-3xl bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Progress Bar */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          {steps.map((s, idx) => {
            const isActive = s.id === step;
            const isCompleted = s.id < step;
            const Icon = s.icon;
            return (
              <div key={s.id} className={`flex-1 py-4 flex flex-col items-center border-r border-neutral-100 dark:border-neutral-800 last:border-0 relative ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 z-10 ${isActive ? 'bg-indigo-600 text-white shadow-md' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400'}`}>
                  {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-700 dark:text-indigo-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-500' : 'text-neutral-400'}`}>
                  {s.title}
                </span>
                {idx < steps.length - 1 && (
                  <div className={`absolute top-8 left-[50%] right-[-50%] h-0.5 z-0 ${isCompleted ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800'}`}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-10 min-h-[400px] flex flex-col">
          
          <div className="flex-1">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">¡Bienvenido a FarmaAI! 🎉</h2>
                  <p className="text-neutral-500">Comencemos configurando la información principal de tu droguería.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Nombre Comercial</label>
                    <input type="text" placeholder="Ej: Droguería Salud Total" className="w-full bg-neutral-50 dark:bg-[#050505] border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3 outline-none focus:border-indigo-500 font-medium text-neutral-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">NIT / RUT</label>
                    <input type="text" className="w-full bg-neutral-50 dark:bg-[#050505] border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3 outline-none focus:border-indigo-500 font-medium text-neutral-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Teléfono Principal</label>
                    <input type="tel" className="w-full bg-neutral-50 dark:bg-[#050505] border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3 outline-none focus:border-indigo-500 font-medium text-neutral-900 dark:text-white" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users size={32} />
                </div>
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Invita a tu equipo</h2>
                <p className="text-neutral-500 max-w-md mx-auto mb-6">Crea los accesos para tus regentes y cajeros. Ellos recibirán un email con sus credenciales.</p>
                
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 bg-neutral-50 dark:bg-[#050505] text-left max-w-lg mx-auto">
                  <div className="flex gap-2 mb-2">
                    <input type="email" placeholder="Email del cajero" className="flex-1 border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-[#111111]" />
                    <select className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-[#111111]">
                      <option>Cajero</option>
                      <option>Regente</option>
                    </select>
                    <button className="bg-neutral-900 dark:bg-white text-white dark:text-black font-bold px-4 rounded-md">Add</button>
                  </div>
                  <p className="text-xs text-neutral-400 mt-4 text-center cursor-pointer hover:underline">Omitir este paso por ahora</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                 <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package size={32} />
                </div>
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Carga tu Inventario</h2>
                <p className="text-neutral-500 max-w-md mx-auto mb-6">Para empezar a vender, necesitas productos. Puedes importar un archivo Excel o conectar con una base de datos CUM (Colombia).</p>
                
                <div className="flex justify-center gap-4">
                  <button className="flex flex-col items-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors w-48">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                      <span className="font-bold">XLSX</span>
                    </div>
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">Importar Excel</span>
                  </button>
                  <button className="flex flex-col items-center p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors w-48">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                      <Package size={20} />
                    </div>
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">Carga Manual</span>
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Configurar POS</h2>
                  <p className="text-neutral-500">Ajusta cómo quieres que funcione tu punto de venta.</p>
                </div>
                <div className="max-w-md mx-auto space-y-4">
                  <div className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Forzar ingreso de Paciente</h4>
                      <p className="text-xs text-neutral-500">Útil para farmacias que llevan historia clínica.</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 accent-indigo-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Fondo de Caja Base</h4>
                      <p className="text-xs text-neutral-500">Dinero en sencillo para cambios diarios.</p>
                    </div>
                    <input type="number" defaultValue={100000} className="w-24 border border-neutral-300 dark:border-neutral-700 rounded text-right px-2 py-1 text-sm bg-white dark:bg-[#111111]" />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Activar IA por WhatsApp</h2>
                <p className="text-neutral-500 max-w-md mx-auto mb-6">FarmaAI se conectará a tu WhatsApp para enviar recordatorios automáticos de refill y cobro de fiados.</p>
                
                <div className="bg-neutral-50 dark:bg-[#050505] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-sm mx-auto">
                  <div className="w-32 h-32 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 mx-auto flex items-center justify-center mb-4 rounded-lg">
                    <span className="text-neutral-400 font-mono text-xs">QR CODE</span>
                  </div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white mb-4">Escanea para vincular dispositivo</p>
                  <button onClick={handleNext} className="text-xs text-indigo-600 font-bold hover:underline">Omitir y configurar después</button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                 <div className="w-24 h-24 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
                  <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-4">¡Todo Listo!</h2>
                <p className="text-neutral-500 max-w-md mx-auto mb-8 text-lg">Tu farmacia ha sido configurada. Ya puedes empezar a vender con el motor operativo 360° más avanzado.</p>
              </div>
            )}
          </div>
          
          {/* Footer Navigation */}
          <div className="pt-8 flex justify-between items-center mt-auto border-t border-neutral-100 dark:border-neutral-800">
            <button 
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
            >
              <ChevronLeft size={16} /> Volver
            </button>
            <button 
              onClick={handleNext}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-colors"
            >
              {step === 6 ? 'Ir al Dashboard' : 'Continuar'} <ChevronRight size={18} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
