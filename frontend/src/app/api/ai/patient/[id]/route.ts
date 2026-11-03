export const dynamic = 'force-dynamic';
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

async function askGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.error('Gemini API error:', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function askOllama(model: string, prompt: string): Promise<string | null> {
  const url = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
  const res = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, format: 'json', stream: false, options: { temperature: 0.2 } }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json())?.response ?? null;
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

    const quota = await takeAiQuota(auth.tenantId);
    if (!quota.allowed) {
      notice = `Se alcanzó el límite de ${DAILY_LIMIT} consultas de IA de hoy. Se muestran recomendaciones por reglas.`;
    } else {
      const raw = model === 'gemini' ? await askGemini(buildPrompt(context, eligible)) : await askOllama(model, buildPrompt(context, eligible));
      if (raw === null) notice = 'La IA no está disponible en este momento. Se muestran recomendaciones por reglas.';
      else recommendations = validateModelOutput(raw, eligible);
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
    });
  } catch (error) {
    console.error('AI recommendations error:', error);
    return NextResponse.json({ error: 'No se pudieron generar recomendaciones' }, { status: 500 });
  }
}
