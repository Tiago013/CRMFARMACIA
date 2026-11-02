import { describe, expect, it } from 'vitest';
import { purchaseAdherence, recentPurchaseCounts } from '@/lib/crm/adherence';

const now = new Date('2026-11-02T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe('purchaseAdherence', () => {
  it('sin compras no hay score', () => {
    expect(purchaseAdherence([], now)).toEqual({ score: null, avgIntervalDays: null, daysSinceLast: null, purchases: 0 });
  });

  it('con una sola compra no se puede medir el ritmo', () => {
    expect(purchaseAdherence([daysAgo(10)], now)).toMatchObject({ score: null, daysSinceLast: 10, purchases: 1 });
  });

  it('recompras mensuales exactas y al día = 100', () => {
    const result = purchaseAdherence([daysAgo(90), daysAgo(60), daysAgo(30), daysAgo(5)], now);
    expect(result.avgIntervalDays).toBe(28);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('un paciente atrasado baja su score', () => {
    const alDia = purchaseAdherence([daysAgo(90), daysAgo(60), daysAgo(30)], now).score!;
    const atrasado = purchaseAdherence([daysAgo(150), daysAgo(120), daysAgo(90)], now).score!;
    expect(atrasado).toBeLessThan(alDia);
    expect(atrasado).toBe(40); // solo queda la parte de regularidad
  });

  it('intervalos irregulares bajan la regularidad', () => {
    const regular = purchaseAdherence([daysAgo(60), daysAgo(40), daysAgo(20), daysAgo(0)], now).score!;
    const irregular = purchaseAdherence([daysAgo(60), daysAgo(55), daysAgo(10), daysAgo(0)], now).score!;
    expect(irregular).toBeLessThan(regular);
  });

  it('con dos compras la regularidad es neutra: no llega a 100', () => {
    expect(purchaseAdherence([daysAgo(40), daysAgo(10)], now).score).toBe(80);
  });

  it('varias ventas el mismo día cuentan como una visita', () => {
    const result = purchaseAdherence([daysAgo(30), daysAgo(30), daysAgo(0)], now);
    expect(result.purchases).toBe(2);
    expect(result.avgIntervalDays).toBe(30);
  });

  it('el score siempre está entre 0 y 100', () => {
    const result = purchaseAdherence([daysAgo(400), daysAgo(399), daysAgo(200)], now);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('recentPurchaseCounts', () => {
  it('separa los últimos 90 días de los 90 anteriores', () => {
    const counts = recentPurchaseCounts([daysAgo(5), daysAgo(80), daysAgo(100), daysAgo(200), new Date('2027-01-01')], now);
    expect(counts).toEqual({ current: 2, previous: 1 });
  });
});
