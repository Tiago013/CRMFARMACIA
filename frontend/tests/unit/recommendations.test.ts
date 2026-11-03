import { describe, expect, it } from 'vitest';
import {
  Candidate, PatientContext, ageRange, allergyTriggers, buildPrompt, eligibleCandidates,
  isContraindicated, ruleBasedRecommendations, validateModelOutput,
} from '@/lib/ai/recommendations';

const catalog: Candidate[] = [
  { id: 'p1', name: 'Amoxicilina 500mg', active_ingredient: 'Amoxicilina', category: 'Antibióticos', stock: 20 },
  { id: 'p2', name: 'Ibuprofeno 400mg', active_ingredient: 'Ibuprofeno', category: 'Analgésicos', stock: 50 },
  { id: 'p3', name: 'Acetaminofén 500mg', active_ingredient: 'Paracetamol', category: 'Analgésicos', stock: 80 },
  { id: 'p4', name: 'Vitamina D3 2000 UI', active_ingredient: 'Colecalciferol', category: 'Vitaminas', stock: 0 },
  { id: 'p5', name: 'Losartán 50mg', active_ingredient: 'Losartán', category: 'Cardiovasculares', stock: 30 },
  { id: 'p6', name: 'Aspirina 100mg', active_ingredient: 'Ácido acetilsalicílico', category: 'Cardiovasculares', stock: 40 },
  { id: 'p7', name: 'Cefalexina 500mg', active_ingredient: 'Cefalexina', category: 'Antibióticos', stock: 15 },
  { id: 'p8', name: 'Omeprazol 20mg', active_ingredient: 'Omeprazol', category: 'Gastrointestinales', stock: 60 },
];

const patient = (over: Partial<PatientContext> = {}): PatientContext => ({
  allergies: null, conditions: [], purchasedCategories: [], purchasedProductIds: [], ageRange: null, ...over,
});

describe('alergias', () => {
  it('una alergia a la penicilina incluye su familia', () => {
    const t = allergyTriggers('Penicilina');
    expect(t).toEqual(expect.arrayContaining(['penicilina', 'amoxicilina', 'ampicilina']));
  });

  it('separa varias alergias y normaliza tildes', () => {
    const t = allergyTriggers('Ácido acetilsalicílico; sulfa y látex');
    expect(t).toEqual(expect.arrayContaining(['acido acetilsalicilico', 'sulfametoxazol', 'latex']));
  });

  it('"ninguna" no es una alergia', () => {
    expect(allergyTriggers('Ninguna')).toEqual([]);
    expect(allergyTriggers(null)).toEqual([]);
  });

  it('detecta el principio activo aunque el nombre comercial no lo diga', () => {
    expect(isContraindicated(catalog[5], allergyTriggers('aspirina'))).toBe(true);
    expect(isContraindicated(catalog[2], allergyTriggers('aspirina'))).toBe(false);
  });
});

describe('eligibleCandidates', () => {
  it('quita sin stock, ya comprados y contraindicados', () => {
    const ids = eligibleCandidates(catalog, patient({ allergies: 'Penicilina, AINE', purchasedProductIds: ['p8'] })).map((c) => c.id);
    expect(ids).toEqual(['p3', 'p5', 'p7']);
  });
});

describe('buildPrompt', () => {
  it('no incluye datos identificables y lista el catálogo por id', () => {
    const prompt = buildPrompt(patient({ allergies: 'Penicilina', ageRange: '40 a 59' }), catalog);
    expect(prompt).toContain('p3 | Acetaminofén 500mg');
    expect(prompt).toContain('40 a 59');
    expect(prompt).not.toMatch(/Nombre:|cédula|teléfono/i);
  });
});

describe('validateModelOutput', () => {
  const eligible = eligibleCandidates(catalog, patient({ allergies: 'Penicilina' }));

  it('acepta productos elegibles y usa el nombre del catálogo', () => {
    const recs = validateModelOutput('[{"product_id":"p3","confidence_score":0.9,"reason":"Dolor frecuente"}]', eligible);
    expect(recs).toEqual([{ product_id: 'p3', product_name: 'Acetaminofén 500mg', confidence_score: 0.9, reason: 'Dolor frecuente', search_query: 'Acetaminofén 500mg', source: 'ai' }]);
  });

  it('descarta ids inventados, contraindicados y duplicados; máximo 2', () => {
    const raw = JSON.stringify([
      { product_id: 'p1' }, { product_id: 'inventado' }, { product_id: 'p3' }, { product_id: 'p3' }, { product_id: 'p5' }, { product_id: 'p8' },
    ]);
    expect(validateModelOutput(raw, eligible).map((r) => r.product_id)).toEqual(['p3', 'p5']);
  });

  it('tolera markdown, el formato { recommendations } y puntajes fuera de rango', () => {
    const recs = validateModelOutput('```json\n{"recommendations":[{"product_id":"p8","confidence_score":7}]}\n```', eligible);
    expect(recs[0]).toMatchObject({ product_id: 'p8', confidence_score: 1, reason: 'Sugerido por el modelo' });
  });

  it('una respuesta que no es JSON no produce recomendaciones', () => {
    expect(validateModelOutput('Te recomiendo vitamina C', eligible)).toEqual([]);
  });
});

describe('ruleBasedRecommendations', () => {
  it('sugiere de las categorías que ya compra, con stock y sin contraindicación', () => {
    const p = patient({ allergies: 'Aspirina', purchasedCategories: ['Cardiovasculares'], purchasedProductIds: [] });
    const recs = ruleBasedRecommendations(eligibleCandidates(catalog, p), p);
    expect(recs.map((r) => r.product_id)).toEqual(['p5']);
    expect(recs[0]).toMatchObject({ source: 'rules', reason: 'Compra con frecuencia productos de Cardiovasculares' });
  });

  it('sin historial no inventa nada', () => {
    expect(ruleBasedRecommendations(catalog, patient())).toEqual([]);
  });
});

it('ageRange agrupa sin exponer la fecha', () => {
  const now = new Date('2026-11-03');
  expect(ageRange(new Date('1990-05-01'), now)).toBe('18 a 39');
  expect(ageRange(new Date('1950-01-01'), now)).toBe('60 o más');
  expect(ageRange(null, now)).toBeNull();
});

// Puerta de salida de la fase 3: en 50 casos, nunca un producto inexistente,
// sin stock, ya comprado ni contraindicado, sin importar lo que responda el modelo.
describe('50 casos de prueba: respuestas arbitrarias del modelo', () => {
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const allergyOptions = [null, 'Penicilina', 'Aspirina', 'AINE', 'Sulfa', 'Penicilina, AINE', 'Cefalosporinas', 'Ninguna'];
  const idPool = [...catalog.map((c) => c.id), 'inventado', '', 'p99', 'Vitamina C'];

  for (let n = 1; n <= 50; n++) {
    const p = patient({
      allergies: pick(allergyOptions),
      purchasedProductIds: catalog.filter(() => rand() < 0.25).map((c) => c.id),
      purchasedCategories: ['Analgésicos', 'Cardiovasculares', 'Antibióticos'].filter(() => rand() < 0.5),
    });
    const modelAnswer = rand() < 0.1
      ? 'respuesta rota {'
      : JSON.stringify(Array.from({ length: 1 + Math.floor(rand() * 5) }, () => ({ product_id: pick(idPool), confidence_score: rand() * 2 })));

    it(`caso ${n}: alergias "${p.allergies ?? 'ninguna'}"`, () => {
      const eligible = eligibleCandidates(catalog, p);
      const recs = [...validateModelOutput(modelAnswer, eligible), ...ruleBasedRecommendations(eligible, p)];
      const triggers = allergyTriggers(p.allergies);
      for (const r of recs) {
        const product = catalog.find((c) => c.id === r.product_id);
        expect(product, 'el producto existe').toBeDefined();
        expect(product!.stock).toBeGreaterThan(0);
        expect(p.purchasedProductIds).not.toContain(r.product_id);
        expect(isContraindicated(product!, triggers)).toBe(false);
        expect(r.confidence_score).toBeGreaterThanOrEqual(0);
        expect(r.confidence_score).toBeLessThanOrEqual(1);
      }
    });
  }
});
