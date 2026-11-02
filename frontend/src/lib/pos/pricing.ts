// Cálculo de una venta del POS. Lo usan el navegador (para mostrar el total)
// y el servidor (para cobrar), así ambos dan exactamente el mismo número.

export const TAX_RATE = 0.19; // IVA Colombia

// Redondea a centavos evitando errores de coma flotante (1.005 → 1.01)
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type PricingInput = {
  quantity: number;
  unitPrice: number;
  discountPct?: number;
};

export type PricedLine = {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  gross: number;
  net: number;
  tax: number;
};

export type SaleTotals = {
  lines: PricedLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
};

// Devuelve el motivo si la línea no es válida, o null si lo es
export function validateLine(line: PricingInput): string | null {
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) return 'Cantidad inválida';
  if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) return 'Precio inválido';
  const discount = line.discountPct ?? 0;
  if (!(discount >= 0 && discount <= 100)) return 'Descuento inválido';
  return null;
}

// Descuento % por línea; el IVA se calcula sobre el subtotal ya descontado
export function computeSaleTotals(items: PricingInput[], taxRate = TAX_RATE): SaleTotals {
  const lines = items.map((item) => {
    const discountPct = item.discountPct ?? 0;
    const gross = roundMoney(item.quantity * item.unitPrice);
    const net = roundMoney(gross * (1 - discountPct / 100));
    return {
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct,
      gross,
      net,
      tax: roundMoney(net * taxRate),
    };
  });

  const subtotal = roundMoney(lines.reduce((acc, l) => acc + l.net, 0));
  const discountTotal = roundMoney(lines.reduce((acc, l) => acc + (l.gross - l.net), 0));
  const taxTotal = roundMoney(subtotal * taxRate);

  return { lines, subtotal, discountTotal, taxTotal, grandTotal: roundMoney(subtotal + taxTotal) };
}

// Tolerancia de $1 entre el total que vio el cajero y el que calcula el servidor
export function totalsMatch(clientTotal: number, serverTotal: number, tolerance = 1): boolean {
  return Math.abs(clientTotal - serverTotal) <= tolerance;
}
