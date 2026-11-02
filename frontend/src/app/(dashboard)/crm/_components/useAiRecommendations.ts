import { useState } from 'react';
import { apiClient as api } from '@/lib/axios';

// Cuenta un uso en una ventana de tiempo (para mostrar la cuota de Gemini)
function trackQuota(prefix: 'rpm' | 'rpd', windowMs: number) {
  let count = parseInt(sessionStorage.getItem(`gemini_${prefix}_count`) || localStorage.getItem(`gemini_${prefix}_count`) || '0');
  let reset = parseInt(sessionStorage.getItem(`gemini_${prefix}_reset`) || localStorage.getItem(`gemini_${prefix}_reset`) || '0');
  if (!reset || Date.now() > reset) {
    reset = Date.now() + windowMs;
    count = 0;
    localStorage.setItem(`gemini_${prefix}_reset`, reset.toString());
  }
  localStorage.setItem(`gemini_${prefix}_count`, (count + 1).toString());
}

// Recomendaciones de la IA para un paciente, con caché por sesión
export function useAiRecommendations() {
  const [aiContext, setAiContext] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const generate = async (patientId: string | null) => {
    if (!patientId) return;

    const cacheKey = `ai_recommendations_${patientId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        if (parsedCache?.recommendations?.length > 0 && !parsedCache.recommendations[0]?.reason?.includes('Error')) {
          setAiContext(parsedCache);
          return;
        }
      } catch {
        // ignore cache error and fetch
      }
    }

    setLoadingAi(true);
    try {
      const selectedModel = localStorage.getItem('AI_MODEL') || 'gemini';
      if (selectedModel === 'gemini') {
        trackQuota('rpm', 60_000);
        trackQuota('rpd', 24 * 60 * 60 * 1000);
      }

      const res = await api.get(`/ai/patient/${patientId}?model=${selectedModel}`);
      setAiContext(res.data);
      sessionStorage.setItem(cacheKey, JSON.stringify(res.data));
    } catch (e: any) {
      console.error('Error generating AI recommendations:', e);
      alert('Error generando recomendaciones: ' + (e.response?.data?.error || e.message));
      setAiContext(null);
    } finally {
      setLoadingAi(false);
    }
  };

  return { aiContext, loadingAi, generate, reset: () => setAiContext(null) };
}
