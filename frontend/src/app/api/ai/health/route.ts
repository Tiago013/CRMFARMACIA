import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Diagnóstico de la IA desde el servidor: si Vercel llega a Google, qué modelos
// "flash" ofrece la clave y cuánto tarda cada uno en responder un ping mínimo.
// No devuelve la clave ni datos de pacientes. No consume la cuota diaria de la app,
// pero sí unas pocas llamadas a Gemini: es para depurar, no para la pantalla.

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function ping(apiKey: string, model: string) {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Responde solo: ok' }] }], generationConfig: { maxOutputTokens: 5 } }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    return {
      model,
      status: res.status,
      ms: Date.now() - started,
      modelVersion: body?.modelVersion ?? null,
      thoughtsTokens: body?.usageMetadata?.thoughtsTokenCount ?? 0,
      error: res.ok ? null : body?.error?.message ?? null,
    };
  } catch (error) {
    return { model, status: null, ms: Date.now() - started, error: error instanceof Error ? error.name : String(error) };
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ configured: false });

  const configured = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  // 1. ¿Llega el servidor a Google? Listar modelos es una consulta liviana
  const started = Date.now();
  let models: string[] = [];
  let listError: string | null = null;
  try {
    const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(10_000) });
    const body = await res.json();
    if (!res.ok) listError = `${res.status}: ${body?.error?.message ?? ''}`;
    models = (body?.models ?? [])
      .filter((m: { name: string; supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: { name: string }) => m.name.replace('models/', ''))
      .filter((n: string) => n.includes('flash'));
  } catch (error) {
    listError = error instanceof Error ? error.name : String(error);
  }
  const listMs = Date.now() - started;

  // 2. Ping al modelo configurado y a los "flash-lite"/"flash" estables que ofrezca la clave
  const candidates = [configured, ...models.filter((m) => !m.includes('preview') && !m.includes('exp') && !m.includes('tts') && !m.includes('image') && !m.includes('live')).slice(0, 4)];
  const pings = await Promise.all([...new Set(candidates)].map((m) => ping(apiKey, m)));

  return NextResponse.json({ configured, list: { ms: listMs, error: listError, flashModels: models }, pings });
}
