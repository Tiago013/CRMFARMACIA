import { describe, expect, it } from 'vitest';
import { MOVEMENT_LABELS, expiryBucket, planAdjustment } from '@/lib/inventory/adjustments';

const TODAY = new Date('2026-11-03T12:00:00Z');
const batches = [
  { id: 'vencido', quantity: 4, expiration_date: '2026-10-20' },
  { id: 'pronto', quantity: 5, expiration_date: '2026-12-01' },
  { id: 'tarde', quantity: 10, expiration_date: '2027-06-01' },
  { id: 'vacio', quantity: 0, expiration_date: '2026-11-15' },
];

describe('planAdjustment: salidas', () => {
  it('descuenta primero lo vencido y luego el lote que vence antes', () => {
    expect(planAdjustment(batches, -7, 'DAMAGED', TODAY)).toEqual({
      ok: true,
      changes: [{ batchId: 'vencido', delta: -4 }, { batchId: 'pronto', delta: -3 }],
      newBatchQuantity: 0,
    });
  });

  it('una merma por vencimiento solo toca lotes vencidos', () => {
    expect(planAdjustment(batches, -3, 'EXPIRED', TODAY)).toMatchObject({ ok: true, changes: [{ batchId: 'vencido', delta: -3 }] });
    expect(planAdjustment(batches, -5, 'EXPIRED', TODAY)).toEqual({ ok: false, error: 'Solo hay 4 unidades vencidas para dar de baja' });
  });

  it('no deja stock negativo', () => {
    expect(planAdjustment(batches, -20, 'LOST', TODAY)).toEqual({ ok: false, error: 'Solo hay 19 unidades en stock' });
  });

  it('un conteo con faltante reparte entre varios lotes', () => {
    const plan = planAdjustment(batches, -19, 'COUNT', TODAY);
    expect(plan.ok && plan.changes.map((c) => c.delta).reduce((a, b) => a + b, 0)).toBe(-19);
  });
});

describe('planAdjustment: sobrantes', () => {
  it('el sobrante del conteo va al lote vigente más reciente', () => {
    expect(planAdjustment(batches, 3, 'COUNT', TODAY)).toEqual({ ok: true, changes: [{ batchId: 'tarde', delta: 3 }], newBatchQuantity: 0 });
  });

  it('sin lotes vigentes, crea un lote de ajuste', () => {
    expect(planAdjustment([batches[0]], 2, 'COUNT', TODAY)).toEqual({ ok: true, changes: [], newBatchQuantity: 2 });
  });

  it('una merma no puede sumar unidades', () => {
    expect(planAdjustment(batches, 2, 'DAMAGED', TODAY)).toEqual({ ok: false, error: 'Una merma solo puede restar unidades' });
  });

  it.each([0, 1.5, NaN])('rechaza la diferencia %s', (d) => {
    expect(planAdjustment(batches, d, 'COUNT', TODAY).ok).toBe(false);
  });
});

describe('expiryBucket', () => {
  it.each([
    ['2026-11-02', 'expired'],
    ['2026-11-03', 'd30'],
    ['2026-12-03', 'd30'],
    ['2026-12-04', 'd60'],
    ['2027-02-01', 'd90'],
    ['2027-02-02', null],
  ])('%s → %s', (date, bucket) => {
    expect(expiryBucket(date, TODAY)).toBe(bucket);
  });
});

it('cada tipo de movimiento de ajuste tiene una etiqueta legible', () => {
  expect(MOVEMENT_LABELS.WASTE_EXPIRED).toBe('Vencido');
  expect(MOVEMENT_LABELS.COUNT_ADJUST).toBe('Conteo físico');
});
