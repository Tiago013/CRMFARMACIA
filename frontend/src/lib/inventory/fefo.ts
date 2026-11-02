// FEFO (First Expired, First Out): se vende primero el lote que vence antes.

export type BatchStock = {
  id: string;
  quantity: number;
  expiration_date: Date | string;
};

export type BatchAllocation = { batchId: string; quantity: number };

export type FefoResult = {
  allocations: BatchAllocation[];
  // Unidades que no alcanzó a cubrir ningún lote (sobreventa)
  shortfall: number;
  // Unidades en lotes vencidos, que nunca se venden
  expiredUnits: number;
};

// Inicio del día (UTC) de una fecha; los lotes vencen al terminar su fecha
function dayStart(value: Date | string): number {
  const d = new Date(value);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function isExpired(expiration: Date | string, today: Date = new Date()): boolean {
  return dayStart(expiration) < dayStart(today);
}

// Estado de vencimiento para mostrar en pantalla
export function expiryStatus(expiration: Date | string | null | undefined, today: Date = new Date(), warningDays = 30): 'expired' | 'expiring' | 'ok' | null {
  if (!expiration) return null;
  const days = (dayStart(expiration) - dayStart(today)) / 86_400_000;
  if (days < 0) return 'expired';
  if (days <= warningDays) return 'expiring';
  return 'ok';
}

export function allocateFefo(batches: BatchStock[], requested: number, today: Date = new Date()): FefoResult {
  const withStock = batches.filter((b) => b.quantity > 0);
  const expiredUnits = withStock.filter((b) => isExpired(b.expiration_date, today)).reduce((acc, b) => acc + b.quantity, 0);
  const ordered = withStock
    .filter((b) => !isExpired(b.expiration_date, today))
    .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime());

  const allocations: BatchAllocation[] = [];
  let remaining = requested;

  for (const batch of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, quantity: take });
    remaining -= take;
  }

  return { allocations, shortfall: Math.max(remaining, 0), expiredUnits };
}

export type SaleOutMovement = {
  product_id: string;
  batch_id: string | null;
  quantity: number; // negativo: salida
};

export type RestockEntry = { productId: string; batchId: string | null; quantity: number };

// Un reembolso devuelve a cada lote exactamente lo que salió de él en la venta.
// Agrupa por lote para no generar varios movimientos sobre el mismo.
export function planRefundRestock(movements: SaleOutMovement[]): RestockEntry[] {
  const byKey = new Map<string, RestockEntry>();
  for (const m of movements) {
    const key = `${m.product_id}:${m.batch_id ?? ''}`;
    const entry = byKey.get(key) ?? { productId: m.product_id, batchId: m.batch_id, quantity: 0 };
    entry.quantity += Math.abs(m.quantity);
    byKey.set(key, entry);
  }
  return [...byKey.values()].filter((e) => e.quantity > 0);
}
