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
};

export function allocateFefo(batches: BatchStock[], requested: number): FefoResult {
  const ordered = batches
    .filter((b) => b.quantity > 0)
    .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime());

  const allocations: BatchAllocation[] = [];
  let remaining = requested;

  for (const batch of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, quantity: take });
    remaining -= take;
  }

  return { allocations, shortfall: Math.max(remaining, 0) };
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
