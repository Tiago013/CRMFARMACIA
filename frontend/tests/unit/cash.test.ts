import { describe, expect, it } from 'vitest';
import { cashSummary, countCash, sanitizeDenominations } from '@/lib/pos/cash';

describe('countCash', () => {
  it('suma billetes y monedas', () => {
    expect(countCash({ b50: 2, b20: 3, b10: 4, m1000: 10, m500: 6, m200: 10 })).toBe(100000 + 60000 + 40000 + 10000 + 3000 + 2000);
  });

  it('ignora claves desconocidas, negativos y decimales', () => {
    expect(countCash({ b50: 1, b1000000: 5, b20: -2, m500: 1.5, m100: 'x' })).toBe(50000);
  });

  it('acepta cantidades como texto numérico', () => {
    expect(countCash({ b10: '3' })).toBe(30000);
  });
});

describe('sanitizeDenominations', () => {
  it('devuelve todas las denominaciones, en 0 las inválidas', () => {
    const d = sanitizeDenominations({ b100: 1, b50: -1, extra: 9 });
    expect(d.b100).toBe(1);
    expect(d.b50).toBe(0);
    expect(Object.keys(d)).toHaveLength(11);
    expect('extra' in d).toBe(false);
  });

  it('tolera entradas que no son objeto', () => {
    expect(countCash(sanitizeDenominations(null))).toBe(0);
    expect(countCash(sanitizeDenominations('hola'))).toBe(0);
  });
});

describe('cashSummary', () => {
  it('calcula lo esperado sin conteo', () => {
    expect(cashSummary(200000, 76339.69)).toEqual({ opening: 200000, cashSales: 76339.69, expected: 276339.69, counted: undefined, difference: undefined });
  });

  it('caja cuadrada: diferencia 0', () => {
    expect(cashSummary(200000, 50000, 250000).difference).toBe(0);
  });

  it('faltante negativo y sobrante positivo', () => {
    expect(cashSummary(200000, 50000, 245000).difference).toBe(-5000);
    expect(cashSummary(200000, 50000, 250050).difference).toBe(50);
  });
});
