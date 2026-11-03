// Recomendaciones de productos para un paciente, con límites claros:
// - al modelo solo se envían datos seudonimizados (sin nombre, documento ni teléfono)
// - el modelo elige entre productos que existen y tienen stock (por id)
// - toda recomendación se valida: existe, tiene stock y no choca con alergias
// - si el modelo falla, se usa una regla determinista y se dice que es una regla

export type Candidate = {
  id: string;
  name: string;
  active_ingredient: string | null;
  category: string | null;
  stock: number;
};

export type PatientContext = {
  allergies: string | null;
  conditions: string[];
  purchasedCategories: string[];
  purchasedProductIds: string[];
  ageRange: string | null;
};

export type Recommendation = {
  product_id: string;
  product_name: string;
  confidence_score: number;
  reason: string;
  search_query: string;
  source: 'ai' | 'rules';
};

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Alergia declarada → principios activos que la disparan (familias comunes)
const ALLERGY_FAMILIES: Record<string, string[]> = {
  penicilina: ['penicilina', 'amoxicilina', 'ampicilina', 'dicloxacilina', 'oxacilina'],
  betalactamico: ['penicilina', 'amoxicilina', 'ampicilina', 'cefalexina', 'ceftriaxona', 'cefuroxima'],
  cefalosporina: ['cefalexina', 'ceftriaxona', 'cefuroxima', 'cefazolina'],
  aspirina: ['aspirina', 'acido acetilsalicilico'],
  aine: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'aspirina', 'acido acetilsalicilico', 'ketorolaco', 'meloxicam'],
  sulfa: ['sulfametoxazol', 'sulfadiazina', 'sulfasalazina'],
  ibuprofeno: ['ibuprofeno'],
  naproxeno: ['naproxeno'],
  diclofenaco: ['diclofenaco'],
};

// Palabras que, si aparecen en el producto, lo hacen incompatible con las alergias
export function allergyTriggers(allergies: string | null): string[] {
  if (!allergies) return [];
  const triggers = new Set<string>();
  for (const raw of allergies.split(/[,;/]| y /)) {
    const term = normalize(raw);
    if (!term || term === 'ninguna' || term === 'no') continue;
    triggers.add(term);
    for (const [family, members] of Object.entries(ALLERGY_FAMILIES)) {
      if (term.includes(family) || family.includes(term)) members.forEach((m) => triggers.add(m));
    }
  }
  return [...triggers];
}

export function isContraindicated(product: Pick<Candidate, 'name' | 'active_ingredient'>, triggers: string[]): boolean {
  const text = normalize(`${product.name} ${product.active_ingredient ?? ''}`);
  return triggers.some((t) => t.length >= 3 && text.includes(t));
}

// Productos que se pueden recomendar: con stock, no comprados ya y sin conflicto de alergias
export function eligibleCandidates(candidates: Candidate[], patient: PatientContext): Candidate[] {
  const triggers = allergyTriggers(patient.allergies);
  const bought = new Set(patient.purchasedProductIds);
  return candidates.filter((c) => c.stock > 0 && !bought.has(c.id) && !isContraindicated(c, triggers));
}

// Prompt sin datos identificables; el modelo responde con ids del catálogo
export function buildPrompt(patient: PatientContext, candidates: Candidate[]): string {
  const catalog = candidates.slice(0, 60).map((c) => `${c.id} | ${c.name} | ${c.active_ingredient ?? '-'} | ${c.category ?? '-'}`).join('\n');
  return `Eres un asistente para un regente de farmacia en Colombia. Sugiere hasta 2 productos de venta libre o de seguimiento para este paciente.
Perfil (seudonimizado):
- Rango de edad: ${patient.ageRange ?? 'desconocido'}
- Alergias declaradas: ${patient.allergies || 'ninguna'}
- Condiciones: ${patient.conditions.join(', ') || 'ninguna registrada'}
- Categorías que compra: ${patient.purchasedCategories.join(', ') || 'sin historial'}

Solo puedes elegir productos de este catálogo (id | nombre | principio activo | categoría):
${catalog}

Responde SOLO con JSON, sin markdown: [{"product_id": "...", "confidence_score": 0.0-1.0, "reason": "máximo 20 palabras"}]`;
}

// Interpreta la respuesta del modelo y descarta todo lo que no sea un producto elegible
export function validateModelOutput(raw: string, eligible: Candidate[]): Recommendation[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return [];
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray((parsed as any)?.recommendations) ? (parsed as any).recommendations : [];
  const byId = new Map(eligible.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const out: Recommendation[] = [];

  for (const item of list) {
    const product = byId.get(String(item?.product_id ?? ''));
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    const score = Number(item?.confidence_score);
    out.push({
      product_id: product.id,
      product_name: product.name,
      confidence_score: Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0.5,
      reason: String(item?.reason ?? '').slice(0, 160) || 'Sugerido por el modelo',
      search_query: product.name,
      source: 'ai',
    });
    if (out.length === 2) break;
  }
  return out;
}

// Respaldo determinista: productos de las categorías que el paciente ya compra
export function ruleBasedRecommendations(eligible: Candidate[], patient: PatientContext): Recommendation[] {
  const categories = new Set(patient.purchasedCategories);
  return eligible
    .filter((c) => c.category && categories.has(c.category))
    .sort((a, b) => b.stock - a.stock || a.name.localeCompare(b.name))
    .slice(0, 2)
    .map((c) => ({
      product_id: c.id,
      product_name: c.name,
      confidence_score: 0.5,
      reason: `Compra con frecuencia productos de ${c.category}`,
      search_query: c.name,
      source: 'rules' as const,
    }));
}

export function ageRange(birthDate: Date | null, now = new Date()): string | null {
  if (!birthDate) return null;
  const age = now.getFullYear() - birthDate.getFullYear();
  if (age < 18) return 'menor de 18';
  if (age < 40) return '18 a 39';
  if (age < 60) return '40 a 59';
  return '60 o más';
}
