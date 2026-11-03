// Ajustes de inventario (conteo físico y mermas) repartidos entre lotes.
import { BatchStock, isExpired } from './fefo';

export const ADJUSTMENT_REASONS = {
  COUNT: { movement: 'COUNT_ADJUST', label: 'Conteo físico' },
  EXPIRED: { movement: 'WASTE_EXPIRED', label: 'Vencido' },
  DAMAGED: { movement: 'WASTE_DAMAGED', label: 'Averiado' },
  LOST: { movement: 'WASTE_LOST', label: 'Pérdida o robo' },
} as const;

export type AdjustmentReason = keyof typeof ADJUSTMENT_REASONS;

export const MOVEMENT_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(ADJUSTMENT_REASONS).map((r) => [r.movement, r.label])
);

export type BatchChange = { batchId: string; delta: number };

export type AdjustmentPlan =
  | { ok: true; changes: BatchChange[]; newBatchQuantity: number }
  | { ok: false; error: string };

const byExpiration = (a: BatchStock, b: BatchStock) =>
  new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();

// difference < 0: salen unidades. Se descuentan primero de los lotes vencidos
// (si la causa es vencimiento, solo de ellos) y luego del que vence antes.
// difference > 0: sobrante del conteo; se suma al lote vigente más reciente o,
// si no hay ninguno, a un lote nuevo de ajuste (newBatchQuantity).
export function planAdjustment(
  batches: BatchStock[],
  difference: number,
  reason: AdjustmentReason,
  today: Date = new Date()
): AdjustmentPlan {
  if (!Number.isInteger(difference) || difference === 0) {
    return { ok: false, error: 'La diferencia debe ser un número entero distinto de 0' };
  }

  if (difference > 0) {
    if (reason !== 'COUNT') return { ok: false, error: 'Una merma solo puede restar unidades' };
    const target = batches.filter((b) => !isExpired(b.expiration_date, today)).sort(byExpiration).pop();
    return target
      ? { ok: true, changes: [{ batchId: target.id, delta: difference }], newBatchQuantity: 0 }
      : { ok: true, changes: [], newBatchQuantity: difference };
  }

  const withStock = batches.filter((b) => b.quantity > 0);
  const expired = withStock.filter((b) => isExpired(b.expiration_date, today)).sort(byExpiration);
  const valid = withStock.filter((b) => !isExpired(b.expiration_date, today)).sort(byExpiration);
  const pool = reason === 'EXPIRED' ? expired : [...expired, ...valid];

  let remaining = -difference;
  const changes: BatchChange[] = [];
  for (const batch of pool) {
    if (remaining === 0) break;
    const take = Math.min(batch.quantity, remaining);
    changes.push({ batchId: batch.id, delta: -take });
    remaining -= take;
  }

  if (remaining > 0) {
    const available = pool.reduce((acc, b) => acc + b.quantity, 0);
    return {
      ok: false,
      error: reason === 'EXPIRED'
        ? `Solo hay ${available} unidades vencidas para dar de baja`
        : `Solo hay ${available} unidades en stock`,
    };
  }
  return { ok: true, changes, newBatchQuantity: 0 };
}

// Agrupa lotes con stock por ventana de vencimiento
export type ExpiryBucket = 'expired' | 'd30' | 'd60' | 'd90';

export function expiryBucket(expiration: Date | string, today: Date = new Date()): ExpiryBucket | null {
  const d = new Date(expiration);
  const days = Math.floor(
    (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / 86_400_000
  );
  if (days < 0) return 'expired';
  if (days <= 30) return 'd30';
  if (days <= 60) return 'd60';
  if (days <= 90) return 'd90';
  return null;
}
