export type CartItem = { id: string; name: string; qty: number; price: number; discount: number };

export type SelectedPatient = { id: string; name: string; refillSuggestion?: string };

export type PaymentMethod = 'cash' | 'card' | 'mixed' | 'fiado';

export type DrawerStatus = 'loading' | 'open' | 'closed';

export type DrawerMode = 'open' | 'close';

export type Denominations = Record<
  'b100' | 'b50' | 'b20' | 'b10' | 'b5' | 'b2' | 'm1000' | 'm500' | 'm200' | 'm100' | 'm50',
  number
>;

export const BILLS = [
  { key: 'b100', val: 100000, label: '$100.000' },
  { key: 'b50', val: 50000, label: '$50.000' },
  { key: 'b20', val: 20000, label: '$20.000' },
  { key: 'b10', val: 10000, label: '$10.000' },
  { key: 'b5', val: 5000, label: '$5.000' },
  { key: 'b2', val: 2000, label: '$2.000' },
] as const;

export const COINS = [
  { key: 'm1000', val: 1000, label: '$1.000' },
  { key: 'm500', val: 500, label: '$500' },
  { key: 'm200', val: 200, label: '$200' },
  { key: 'm100', val: 100, label: '$100' },
  { key: 'm50', val: 50, label: '$50' },
] as const;

// Base sugerida al abrir caja (sencillo típico) y conteo vacío al cerrar
export const OPENING_DENOMINATIONS: Denominations = { b100: 0, b50: 2, b20: 3, b10: 4, b5: 5, b2: 5, m1000: 10, m500: 6, m200: 10, m100: 0, m50: 0 };
export const EMPTY_DENOMINATIONS: Denominations = { b100: 0, b50: 0, b20: 0, b10: 0, b5: 0, b2: 0, m1000: 0, m500: 0, m200: 0, m100: 0, m50: 0 };

export function denominationsTotal(d: Denominations): number {
  return [...BILLS, ...COINS].reduce((acc, { key, val }) => acc + d[key] * val, 0);
}

// Coincidencia exacta por código de barras o SKU (lo que envía un lector)
export function findByCode(products: any[], code: string) {
  const c = code.trim().toLowerCase();
  return c ? products.find(p => p.barcode?.toLowerCase() === c || p.sku?.toLowerCase() === c) : undefined;
}

export const formatCOP = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
