// Arqueo de caja: conteo de billetes y monedas, y cuadre contra lo esperado.
import { roundMoney } from './pricing';

export const DENOMINATION_VALUES = {
  b100: 100000, b50: 50000, b20: 20000, b10: 10000, b5: 5000, b2: 2000,
  m1000: 1000, m500: 500, m200: 200, m100: 100, m50: 50,
} as const;

export type DenominationKey = keyof typeof DENOMINATION_VALUES;
export type Denominations = Record<DenominationKey, number>;

// Total contado; ignora claves desconocidas y cantidades inválidas
export function countCash(denominations: Partial<Record<string, unknown>>): number {
  return (Object.keys(DENOMINATION_VALUES) as DenominationKey[]).reduce((acc, key) => {
    const qty = Number(denominations[key] ?? 0);
    return Number.isInteger(qty) && qty > 0 ? acc + qty * DENOMINATION_VALUES[key] : acc;
  }, 0);
}

// Solo cantidades enteras no negativas de denominaciones conocidas
export function sanitizeDenominations(input: unknown): Denominations {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = {} as Denominations;
  for (const key of Object.keys(DENOMINATION_VALUES) as DenominationKey[]) {
    const qty = Number(source[key] ?? 0);
    out[key] = Number.isInteger(qty) && qty > 0 ? qty : 0;
  }
  return out;
}

export const CASH_METHODS = ['cash', 'CASH'];

// Esperado = base + ventas en efectivo del turno; diferencia > 0 es sobrante
export function cashSummary(opening: number, cashSales: number, counted?: number) {
  const expected = roundMoney(opening + cashSales);
  return {
    opening: roundMoney(opening),
    cashSales: roundMoney(cashSales),
    expected,
    counted: counted === undefined ? undefined : roundMoney(counted),
    difference: counted === undefined ? undefined : roundMoney(counted - expected),
  };
}
