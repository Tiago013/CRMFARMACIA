export const dynamic = 'force-dynamic';
export const maxDuration = 60; // la IA puede tardar; Vercel corta por defecto antes
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  Candidate, PatientContext, Recommendation, ageRange, allergyTriggers, buildPrompt,
  eligibleCandidates, isContraindicated, ruleBasedRecommendations, validateModelOutput,
} from '@/lib/ai/recommendations';

// Usos de IA por farmacia y día: protege la cuota gratuita de la clave de la app
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 40);

// Suma un uso solo si no se pasó del límite (un único UPDATE atómico)
async function takeAiQuota(tenantId: string): Promise<{ allowed: boolean; used: number }> {
  const today = new Date().toISOString().split('T')[0];
  const rows = await prisma.$queryRaw<{ used: number }[]>`
    update public.pharmacies
    set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{ai_usage}', jsonb_build_object(
      'date', ${today}::text,
      'count', case when settings->'ai_usage'->>'date' = ${today}::text
                    then coalesce((settings->'ai_usage'->>'count')::int, 0) + 1 else 1 end))
    where id = ${tenantId}
      and (settings->'ai_usage'->>'date' is distinct from ${today}::text
           or coalesce((settings->'ai_usage'->>'count')::int, 0) < ${DAILY_LIMIT})
    returning (settings->'ai_usage'->>'count')::int as used`;
  return rows.length ? { allowed: true, used: rows[0].used } : { allowed: false, used: DAILY_LIMIT };
}

// text = respuesta del modelo; problem = por qué no la hay (se muestra al usuario);
// meta = qué modelo respondió y cuánto tardó (para diagnosticar sin adivinar)
type ModelMeta = { model: string; ms: number; thoughtsTokens: number };
type ModelReply = { text: string | null; problem?: string; meta?: ModelMeta };

// Flash-Lite: rápido y suficiente para elegir 2 productos de una lista
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

// Sin "pensar": elegir 2 productos de una lista corta no necesita razonamiento,
// y un modelo que razona antes de responder pasa de segundos a más de 25 s. Los
// alias *-latest pueden cambiar de modelo sin aviso (así pasó el 3 de noviembre).
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } };

async function askGemini(prompt: string, attempt = 1, thinkingOff = true): Promise<ModelReply> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: null, problem: 'La IA no está configurada en este servidor (falta GEMINI_API_KEY)' };
  const started = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', ...(thinkingOff ? NO_THINKING : {}) },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    // Un modelo que no permite apagar el razonamiento rechaza la opción: se pide sin ella
    if (res.status === 400 && thinkingOff) {
      console.warn('Gemini rechazó thinkingConfig; se reintenta sin él:', await res.text().catch(() => ''));
      return askGemini(prompt, attempt, false);
    }
    // 503 = servicio de Google saturado: un reintento corto suele bastar
    if (res.status === 503 && attempt === 1) {
      await new Promise(r => setTimeout(r, 1500));
      return askGemini(prompt, 2, thinkingOff);
    }
    if (!res.ok) {
      console.error('Gemini API error:', res.status, await res.text().catch(() => ''));
      return { text: null, problem: res.status === 429 ? 'Gemini alcanzó su cuota gratuita' : `Gemini respondió con error ${res.status}` };
    }
    const data = await res.json();
    const meta: ModelMeta = {
      model: data?.modelVersion ?? GEMINI_MODEL,
      ms: Date.now() - started,
      thoughtsTokens: data?.usageMetadata?.thoughtsTokenCount ?? 0,
    };
    console.info('Gemini respondió', meta);
    return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null, problem: 'Gemini no devolvió texto', meta };
  } catch (error) {
    console.error('Gemini request failed:', { model: GEMINI_MODEL, ms: Date.now() - started, thinkingOff }, error);
    return { text: null, problem: 'Gemini no respondió a tiempo' };
  }
}

async function askOllama(model: string, prompt: string): Promise<ModelReply> {
  const url = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
  const res = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, format: 'json', stream: false, options: { temperature: 0.2 } }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res?.ok) return { text: null, problem: `No hay un servidor Ollama local con el modelo ${model}` };
  return { text: (await res.json())?.response ?? null, problem: 'El modelo local no devolvió texto' };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const model = new URL(request.url).searchParams.get('model') || 'gemini';

    const patient = await prisma.patient.findFirst({
      where: { id, tenant_id: auth.tenantId },
      select: {
        allergies: true, tags: true, birth_date: true,
        sales: { select: { items: { select: { product_id: true, product: { select: { category: { select: { name: true } } } } } } } },
      },
    });
    if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });

    const items = patient.sales.flatMap(s => s.items);
    const context: PatientContext = {
      allergies: patient.allergies,
      conditions: patient.tags,
      purchasedCategories: [...new Set(items.map(i => i.product.category?.name).filter(Boolean) as string[])],
      purchasedProductIds: [...new Set(items.map(i => i.product_id))],
      ageRange: ageRange(patient.birth_date),
    };

    // Catálogo real de la farmacia con su stock
    const products = await prisma.product.findMany({
      where: { tenant_id: auth.tenantId },
      select: { id: true, brand_name: true, active_ingredient: true, category: { select: { name: true } }, batches: { select: { quantity: true } } },
    });
    const candidates: Candidate[] = products.map(p => ({
      id: p.id,
      name: p.brand_name,
      active_ingredient: p.active_ingredient,
      category: p.category?.name ?? null,
      stock: p.batches.reduce((acc, b) => acc + b.quantity, 0),
    }));
    const eligible = eligibleCandidates(candidates, context);

    // Lo que se le muestra al regente para que entienda de dónde sale cada sugerencia
    const triggers = allergyTriggers(context.allergies);
    const evidence = {
      purchased_categories: context.purchasedCategories,
      allergies: context.allergies || 'Ninguna registrada',
      excluded_by_allergy: candidates.filter(c => c.stock > 0 && isContraindicated(c, triggers)).length,
    };

    let recommendations: Recommendation[] = [];
    let notice: string | null = null;
    let modelMeta: ModelMeta | null = null;

    const quota = await takeAiQuota(auth.tenantId);
    if (!quota.allowed) {
      notice = `Se alcanzó el límite de ${DAILY_LIMIT} consultas de IA de hoy. Se muestran recomendaciones por reglas.`;
    } else {
      const reply = model === 'gemini' ? await askGemini(buildPrompt(context, eligible)) : await askOllama(model, buildPrompt(context, eligible));
      modelMeta = reply.meta ?? null;
      if (reply.text === null) notice = `${reply.problem}. Se muestran recomendaciones por reglas.`;
      else recommendations = validateModelOutput(reply.text, eligible);
    }

    if (recommendations.length === 0) {
      recommendations = ruleBasedRecommendations(eligible, context);
      if (!notice && recommendations.length) notice = 'La IA no propuso productos válidos del inventario. Se muestran recomendaciones por reglas.';
    }

    return NextResponse.json({
      recommendations,
      evidence,
      notice,
      usage: { used: quota.used, limit: DAILY_LIMIT },
      model: modelMeta,
    });
  } catch (error) {
    console.error('AI recommendations error:', error);
    return NextResponse.json({ error: 'No se pudieron generar recomendaciones' }, { status: 500 });
  }
}
