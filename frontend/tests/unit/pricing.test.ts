import { describe, expect, it } from 'vitest';
import { TAX_RATE, computeSaleTotals, roundMoney, totalsMatch, validateLine } from '@/lib/pos/pricing';

describe('roundMoney', () => {
  it('redondea a centavos sin errores de coma flotante', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1234.5649)).toBe(1234.56);
  });
});

describe('computeSaleTotals', () => {
  it('suma líneas y aplica IVA del 19 %', () => {
    const totals = computeSaleTotals([
      { quantity: 2, unitPrice: 5000 },
      { quantity: 1, unitPrice: 12000 },
    ]);
    expect(totals.subtotal).toBe(22000);
    expect(totals.taxTotal).toBe(22000 * TAX_RATE);
    expect(totals.grandTotal).toBe(26180);
    expect(totals.discountTotal).toBe(0);
  });

  it('aplica el descuento por línea antes del IVA', () => {
    const totals = computeSaleTotals([{ quantity: 3, unitPrice: 10000, discountPct: 15 }]);
    expect(totals.lines[0].gross).toBe(30000);
    expect(totals.lines[0].net).toBe(25500);
    expect(totals.discountTotal).toBe(4500);
    expect(totals.taxTotal).toBe(4845);
    expect(totals.grandTotal).toBe(30345);
  });

  it('un descuento del 100 % deja la línea en cero', () => {
    const totals = computeSaleTotals([{ quantity: 1, unitPrice: 8000, discountPct: 100 }]);
    expect(totals.grandTotal).toBe(0);
    expect(totals.discountTotal).toBe(8000);
  });

  it('un carrito vacío da cero', () => {
    expect(computeSaleTotals([]).grandTotal).toBe(0);
  });

  it('calcula el IVA de cada línea', () => {
    const totals = computeSaleTotals([{ quantity: 1, unitPrice: 999.99 }]);
    expect(totals.lines[0].tax).toBe(190);
  });

  it('las líneas (neto + IVA) suman exactamente el total de la venta', () => {
    // Precios con centavos donde IVA(suma) ≠ suma(IVA por línea)
    const totals = computeSaleTotals([
      { quantity: 1, unitPrice: 0.05 },
      { quantity: 1, unitPrice: 0.05 },
      { quantity: 3, unitPrice: 1234.57, discountPct: 7 },
    ]);
    const linesTotal = roundMoney(totals.lines.reduce((acc, l) => acc + l.total, 0));
    expect(linesTotal).toBe(totals.grandTotal);
    expect(totals.lines[2].total).toBe(roundMoney(totals.lines[2].net + totals.lines[2].tax));
  });

  it('acepta otra tasa de impuesto', () => {
    expect(computeSaleTotals([{ quantity: 1, unitPrice: 1000 }], 0).grandTotal).toBe(1000);
  });
});

describe('validateLine', () => {
  it('acepta una línea normal', () => {
    expect(validateLine({ quantity: 2, unitPrice: 100, discountPct: 10 })).toBeNull();
  });

  it.each([0, -1, 1.5, NaN])('rechaza la cantidad %s', (quantity) => {
    expect(validateLine({ quantity, unitPrice: 100 })).toBe('Cantidad inválida');
  });

  it.each([-1, NaN, Infinity])('rechaza el precio %s', (unitPrice) => {
    expect(validateLine({ quantity: 1, unitPrice })).toBe('Precio inválido');
  });

  it.each([-5, 101, NaN])('rechaza el descuento %s', (discountPct) => {
    expect(validateLine({ quantity: 1, unitPrice: 100, discountPct })).toBe('Descuento inválido');
  });
});

describe('totalsMatch', () => {
  it('tolera hasta $1 de diferencia', () => {
    expect(totalsMatch(1000, 1000.9)).toBe(true);
    expect(totalsMatch(1000, 1001)).toBe(true);
  });

  it('detecta un total manipulado', () => {
    expect(totalsMatch(500, 1000)).toBe(false);
  });
});
