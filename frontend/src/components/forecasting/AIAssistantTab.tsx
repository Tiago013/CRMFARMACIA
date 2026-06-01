import React, { useState, useEffect } from 'react';
import { BrainCircuit, Key, CheckCircle, AlertCircle, Send, Loader2, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient as api } from '@/lib/axios';

export default function AIAssistantTab({ data }: { data?: any }) {
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini');
  
  // Patient state
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Quota Tracking State
  const [rpmRemaining, setRpmRemaining] = useState(5);
  const [rpdRemaining, setRpdRemaining] = useState(20);
  const [rpmTimeUntilReset, setRpmTimeUntilReset] = useState('');
  const [rpdTimeUntilReset, setRpdTimeUntilReset] = useState('');

  // Manage Quota Timer
  useEffect(() => {
    const checkQuota = () => {
      // RPM Check
      const storedRpmReset = localStorage.getItem('gemini_rpm_reset');
      const storedRpmCount = localStorage.getItem('gemini_rpm_count');
      if (storedRpmReset && storedRpmCount) {
        if (Date.now() > parseInt(storedRpmReset)) {
          localStorage.removeItem('gemini_rpm_reset');
          localStorage.removeItem('gemini_rpm_count');
          setRpmRemaining(5);
        } else {
          setRpmRemaining(Math.max(0, 5 - parseInt(storedRpmCount)));
        }
      }

      // RPD Check
      const storedRpdReset = localStorage.getItem('gemini_rpd_reset');
      const storedRpdCount = localStorage.getItem('gemini_rpd_count');
      if (storedRpdReset && storedRpdCount) {
        if (Date.now() > parseInt(storedRpdReset)) {
          localStorage.removeItem('gemini_rpd_reset');
          localStorage.removeItem('gemini_rpd_count');
          setRpdRemaining(20);
        } else {
          setRpdRemaining(Math.max(0, 20 - parseInt(storedRpdCount)));
        }
      }
    };
    checkQuota();
    
    const interval = setInterval(() => {
      checkQuota();
      // RPM Timer
      const rpmReset = localStorage.getItem('gemini_rpm_reset');
      if (rpmReset) {
        const diff = parseInt(rpmReset) - Date.now();
        if (diff > 0) {
          const seconds = Math.floor(diff / 1000);
          setRpmTimeUntilReset(`00:${seconds.toString().padStart(2, '0')}`);
        } else {
          setRpmTimeUntilReset('');
        }
      }
      // RPD Timer
      const rpdReset = localStorage.getItem('gemini_rpd_reset');
      if (rpdReset) {
        const diff = parseInt(rpdReset) - Date.now();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setRpdTimeUntilReset(`${hours}h ${mins}m`);
        } else {
          setRpdTimeUntilReset('');
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const trackQuotaUsage = () => {
    // RPM Logic
    let rpmCount = parseInt(localStorage.getItem('gemini_rpm_count') || '0');
    let rpmReset = parseInt(localStorage.getItem('gemini_rpm_reset') || '0');
    if (!rpmReset || Date.now() > rpmReset) {
      rpmReset = Date.now() + 60000; // 1 minute
      rpmCount = 0;
      localStorage.setItem('gemini_rpm_reset', rpmReset.toString());
    }
    rpmCount++;
    localStorage.setItem('gemini_rpm_count', rpmCount.toString());
    setRpmRemaining(Math.max(0, 5 - rpmCount));

    // RPD Logic
    let rpdCount = parseInt(localStorage.getItem('gemini_rpd_count') || '0');
    let rpdReset = parseInt(localStorage.getItem('gemini_rpd_reset') || '0');
    if (!rpdReset || Date.now() > rpdReset) {
      rpdReset = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      rpdCount = 0;
      localStorage.setItem('gemini_rpd_reset', rpdReset.toString());
    }
    rpdCount++;
    localStorage.setItem('gemini_rpd_count', rpdCount.toString());
    setRpdRemaining(Math.max(0, 20 - rpdCount));
  };

  useEffect(() => {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setApiKey('');
    }
    const storedModel = localStorage.getItem('AI_MODEL');
    if (storedModel) {
      setSelectedModel(storedModel);
    }
    
    fetchPatients();
  }, []);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('AI_MODEL', model);
    setIsConnected(false);
    setRecommendation(null); // Clear previous response so they can compare
  };

  const testConnection = async () => {
    setIsConnecting(true);
    try {
      if (selectedModel === 'gemini') {
        if (!apiKey) {
          toast.error("Por favor ingresa una API Key de Google");
          return setIsConnecting(false);
        }
        trackQuotaUsage();
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Hola' }] }] })
        });
        if (response.ok) {
          setIsConnected(true);
          localStorage.setItem('GEMINI_API_KEY', apiKey);
          toast.success("Conexión con Gemini Exitosa");
        } else if (response.status === 429) {
          setIsConnected(true);
          localStorage.setItem('GEMINI_API_KEY', apiKey);
          toast.success("Conexión Exitosa (Límite de cuota detectado)");
        } else {
          setIsConnected(false);
          toast.error("Error al conectar: API Key inválida");
        }
      } else {
        // Test Ollama connection
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
           const data = await response.json();
           const models = data.models || [];
           const hasModel = models.some((m: any) => m.name.includes(selectedModel) || m.name.startsWith(selectedModel));
           
           setIsConnected(true);
           if (hasModel) {
             toast.success(`Conexión exitosa a Ollama. Modelo '${selectedModel}' listo.`);
           } else {
             toast.error(`Ollama conectado, pero '${selectedModel}' no está instalado. Ejecuta 'ollama run ${selectedModel}'`);
           }
        } else {
          setIsConnected(false);
          toast.error("Error conectando a Ollama en el puerto 11434");
        }
      }
    } catch (e) {
      setIsConnected(false);
      toast.error(selectedModel === 'gemini' ? "Error de conexión con Google" : "No se detectó Ollama. ¿Está corriendo la aplicación Ollama?");
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const res = await api.get('/crm/patients');
      if (res.data && Array.isArray(res.data)) {
        setPatients(res.data);
        if (res.data.length > 0) {
          setSelectedPatientId(res.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Error al cargar los pacientes");
    } finally {
      setLoadingPatients(false);
    }
  };


  const generateRecommendation = async () => {
    if (!isConnected || !selectedPatientId) {
      if (!isConnected) toast.error("Primero debes Testear la Conexión con el modelo seleccionado");
      return;
    }
    if (selectedModel === 'gemini' && !apiKey) {
      toast.error("Se requiere una API Key para Gemini");
      return;
    }
    
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    setIsGenerating(true);
    try {
      let purchaseHistoryText = "Ninguna compra registrada.";
      if (patient.sales && patient.sales.length > 0) {
        purchaseHistoryText = patient.sales.map((sale: any) => {
          const items = sale.items?.map((item: any) => item.product?.brand_name || "Producto desconocido").join(", ") || "Sin items";
          return `- ${new Date(sale.created_at).toLocaleDateString()}: ${items}`;
        }).join("\n      ");
      }

      const prompt = `Eres un asesor clínico y comercial de farmacia altamente capacitado. 
      Analiza el siguiente perfil de nuestro paciente:
      - Nombre: ${patient.first_name} ${patient.last_name}
      - EPS (Aseguradora): ${patient.eps || 'No registrada'}
      - Grupo Sanguíneo: ${patient.blood_group || 'No registrado'}
      - Alergias Conocidas: ${patient.allergies || 'Ninguna registrada'}
      - Notas Médicas: ${patient.medical_notes || 'Ninguna nota'}
      - Fecha de última compra: ${patient.last_purchase_date ? new Date(patient.last_purchase_date).toLocaleDateString() : 'Nunca'}
      - Historial de Compras Recientes:
      ${purchaseHistoryText}
      
      Actúa como un consultor inteligente. Dame 3 recomendaciones clínicas o comerciales claras, accionables y al punto (en viñetas) sobre qué productos deberíamos ofrecerle de forma segura para realizar "cross-selling", cómo mejorar su adherencia al tratamiento, o estrategias de fidelización específicas para este paciente considerando sus alergias, notas médicas y compras anteriores. No uses saludos largos, ve directo a las recomendaciones.`;

      if (selectedModel === 'gemini') {
        trackQuotaUsage();
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const result = await response.json();
        if (response.ok && result.candidates && result.candidates.length > 0) {
          setRecommendation(result.candidates[0].content.parts[0].text);
        } else if (response.status === 429) {
          toast.error("Límite de cuota alcanzado. Intenta en 1 minuto.");
        } else {
          toast.error("Error al generar recomendación");
        }
      } else {
        // Ollama local generate
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            prompt: prompt,
            stream: false
          })
        });
        
        const result = await response.json();
        if (response.ok && result.response) {
          setRecommendation(result.response);
        } else {
          toast.error(`Error generando con Ollama (${selectedModel})`);
        }
      }
    } catch (error) {
      toast.error(selectedModel === 'gemini' ? "Error de conexión al generar" : "Error de conexión con servidor Ollama local");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Settings Panel */}
      <div className="bg-white dark:bg-[#0A0A0A] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
          <BrainCircuit size={18} className="text-indigo-500" />
          Configuración del Motor de IA
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 items-end mb-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">Proveedor de Inteligencia Artificial</label>
            <select 
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition cursor-pointer"
            >
              <optgroup label="Cloud (Requiere API Key)">
                <option value="gemini">Google Gemini 1.5 Flash</option>
              </optgroup>
              <optgroup label="Local Ollama (Gratis - Privado)">
                <option value="mistral">Mistral (Local)</option>
                <option value="qwen3:14b">Qwen 3 14B (Local)</option>
                <option value="llama3">Llama 3 (Local)</option>
              </optgroup>
            </select>
          </div>
          
          {selectedModel === 'gemini' && (
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">API Key (Google AI Studio)</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Pega tu API Key..."
                className="w-full bg-neutral-50 dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          )}

          <button 
            onClick={() => testConnection()}
            disabled={isConnecting || (selectedModel === 'gemini' && !apiKey)}
            className="w-full md:w-auto px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting && <Loader2 size={16} className="animate-spin" />}
            Testear Conexión
          </button>
        </div>

        {/* Connection Status Banner */}
        <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 text-sm font-medium border ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-500/10 border-neutral-500/20 text-neutral-600 dark:text-neutral-400'}`}>
          {isConnected ? (
            <>
              <CheckCircle size={16} />
              {selectedModel === 'gemini' ? 'Conexión Exitosa con Gemini Cloud' : `Servidor Local Ollama (${selectedModel}) Conectado`}
            </>
          ) : (
            <>
              <AlertCircle size={16} />
              {selectedModel === 'gemini' ? 'Esperando configuración de API Key...' : 'Esperando validación del servidor local Ollama (localhost:11434)...'}
            </>
          )}
        </div>

        {/* Quota Usage Information */}
        {selectedModel === 'gemini' ? (
          <div className="mt-6 p-4 rounded-xl border bg-neutral-500/5 border-neutral-500/20 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-indigo-500" />
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Gemini 1.5 Flash (Free Tier)</span>
              </div>
              {rpdRemaining === 0 ? (
                <div className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  DAILY LIMIT REACHED
                </div>
              ) : rpmRemaining === 0 ? (
                <div className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  MINUTE LIMIT REACHED
                </div>
              ) : null}
            </div>
            
            {/* RPM Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                <span>Requests Per Minute (RPM)</span>
                <span className="font-mono">{5 - rpmRemaining} / 5</span>
              </div>
              <div className="w-full bg-neutral-500/20 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${rpmRemaining > 1 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                  style={{ width: `${((5 - rpmRemaining) / 5) * 100}%` }}
                ></div>
              </div>
              <div className="text-[9px] text-neutral-400 flex justify-between h-3">
                <span>{rpmRemaining === 0 ? 'Wait for reset' : `${rpmRemaining} available`}</span>
                <span>{rpmTimeUntilReset && `Resets in ${rpmTimeUntilReset}`}</span>
              </div>
            </div>

            {/* RPD Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                <span>Requests Per Day (RPD)</span>
                <span className="font-mono">{20 - rpdRemaining} / 20</span>
              </div>
              <div className="w-full bg-neutral-500/20 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${rpdRemaining > 5 ? 'bg-indigo-500' : 'bg-red-500'}`} 
                  style={{ width: `${((20 - rpdRemaining) / 20) * 100}%` }}
                ></div>
              </div>
              <div className="text-[9px] text-neutral-400 flex justify-between h-3">
                <span>{rpdRemaining === 0 ? 'Wait until tomorrow' : `${rpdRemaining} available`}</span>
                <span>{rpdTimeUntilReset && `Resets in ${rpdTimeUntilReset}`}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="text-emerald-500" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Ejecución Local Ilimitada</h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Este modelo corre directamente en el procesador de tu computadora. Es 100% privado y sin límites de cuota (RPM/RPD).</p>
            </div>
          </div>
        )}
      </div>

      {/* Interaction Panel */}
      {isConnected && (
        <div className="bg-indigo-50/50 dark:bg-[#0A0A0A] p-6 rounded-xl border border-indigo-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                  <BrainCircuit className="text-indigo-600 dark:text-indigo-400" />
                  Asesor Clínico IA (Pacientes)
                </h3>
                <p className="text-sm text-indigo-700/70 dark:text-indigo-300/70 mt-1">
                  Analiza el perfil médico y de compras para sugerir cross-selling seguro.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Patient Selector */}
                <div className="w-full md:w-64">
                  <select 
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setRecommendation(null);
                    }}
                    disabled={loadingPatients || patients.length === 0}
                    className="w-full bg-white dark:bg-[#111] border border-indigo-200 dark:border-indigo-900/30 rounded-lg px-3 py-2 text-sm text-indigo-900 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:opacity-50"
                  >
                    {loadingPatients ? (
                      <option value="">Cargando pacientes...</option>
                    ) : patients.length > 0 ? (
                      patients.map(p => (
                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                      ))
                    ) : (
                      <option value="">No hay pacientes</option>
                    )}
                  </select>
                </div>

                <button
                  onClick={generateRecommendation}
                  disabled={isGenerating || !selectedPatientId}
                  className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Analizar Paciente
                </button>
              </div>
            </div>

            {recommendation ? (
              <div className="bg-white dark:bg-[#111] p-5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500">
                <div dangerouslySetInnerHTML={{ __html: recommendation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
              </div>
            ) : (
              <div className="bg-white/50 dark:bg-[#111] border border-dashed border-indigo-200 dark:border-neutral-800 p-8 rounded-lg flex flex-col items-center justify-center text-center">
                <User size={32} className="text-indigo-300 dark:text-indigo-800 mb-3" />
                <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">Selecciona un paciente para analizar</p>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/50 mt-1 max-w-sm">Haz clic en "Analizar Paciente" para enviar su historial médico de forma segura a la IA y recibir sugerencias personalizadas.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
