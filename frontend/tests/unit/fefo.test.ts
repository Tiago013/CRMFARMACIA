import { describe, expect, it } from 'vitest';
import { allocateFefo, planRefundRestock } from '@/lib/inventory/fefo';

const batches = [
  { id: 'tarde', quantity: 10, expiration_date: '2027-12-01' },
  { id: 'pronto', quantity: 3, expiration_date: '2027-01-15' },
  { id: 'medio', quantity: 5, expiration_date: new Date('2027-06-01') },
  { id: 'vacio', quantity: 0, expiration_date: '2026-12-01' },
];

describe('allocateFefo', () => {
  it('toma primero el lote que vence antes', () => {
    const result = allocateFefo(batches, 2);
    expect(result.allocations).toEqual([{ batchId: 'pronto', quantity: 2 }]);
    expect(result.shortfall).toBe(0);
  });

  it('reparte entre varios lotes en orden de vencimiento', () => {
    const result = allocateFefo(batches, 9);
    expect(result.allocations).toEqual([
      { batchId: 'pronto', quantity: 3 },
      { batchId: 'medio', quantity: 5 },
      { batchId: 'tarde', quantity: 1 },
    ]);
  });

  it('ignora lotes sin existencias', () => {
    const ids = allocateFefo(batches, 18).allocations.map((a) => a.batchId);
    expect(ids).not.toContain('vacio');
  });

  it('informa el faltante cuando no alcanza el stock', () => {
    const result = allocateFefo(batches, 20);
    expect(result.allocations.reduce((acc, a) => acc + a.quantity, 0)).toBe(18);
    expect(result.shortfall).toBe(2);
  });

  it('sin lotes, todo es faltante', () => {
    expect(allocateFefo([], 4)).toEqual({ allocations: [], shortfall: 4 });
  });

  it('no modifica el arreglo recibido', () => {
    const copy = structuredClone(batches);
    allocateFefo(batches, 5);
    expect(batches).toEqual(copy);
  });
});

describe('planRefundRestock', () => {
  it('devuelve a cada lote lo que salió de él', () => {
    const plan = planRefundRestock([
      { product_id: 'p1', batch_id: 'b1', quantity: -3 },
      { product_id: 'p1', batch_id: 'b2', quantity: -2 },
    ]);
    expect(plan).toEqual([
      { productId: 'p1', batchId: 'b1', quantity: 3 },
      { productId: 'p1', batchId: 'b2', quantity: 2 },
    ]);
  });

  it('agrupa movimientos repetidos del mismo lote', () => {
    const plan = planRefundRestock([
      { product_id: 'p1', batch_id: 'b1', quantity: -1 },
      { product_id: 'p1', batch_id: 'b1', quantity: -4 },
    ]);
    expect(plan).toEqual([{ productId: 'p1', batchId: 'b1', quantity: 5 }]);
  });

  it('conserva la sobreventa sin lote', () => {
    const plan = planRefundRestock([{ product_id: 'p2', batch_id: null, quantity: -2 }]);
    expect(plan).toEqual([{ productId: 'p2', batchId: null, quantity: 2 }]);
  });

  it('descarta movimientos de cantidad cero', () => {
    expect(planRefundRestock([{ product_id: 'p1', batch_id: 'b1', quantity: 0 }])).toEqual([]);
  });
});
