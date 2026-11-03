import { useState } from 'react';
import { apiClient as api } from '@/lib/axios';

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
        if (parsedCache?.recommendations?.length > 0 && !parsedCache.notice) {
          setAiContext(parsedCache);
          return;
        }
      } catch {
        // ignore cache error and fetch
      }
    }

    setLoadingAi(true);
    try {
      // El límite de uso lo controla el servidor (por farmacia y día)
      const selectedModel = localStorage.getItem('AI_MODEL') || 'gemini';

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
