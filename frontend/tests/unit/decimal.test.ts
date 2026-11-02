import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { decimalsToNumbers } from '@/lib/decimal';

const d = (v: string) => new Prisma.Decimal(v);

describe('decimalsToNumbers', () => {
  it('convierte un Decimal suelto', () => {
    expect(decimalsToNumbers(d('1234.56'))).toBe(1234.56);
  });

  it('convierte montos anidados en objetos y arreglos', () => {
    const sale = { id: 's1', grand_total: d('26180.00'), items: [{ total: d('22000.00'), quantity: 2 }] };
    expect(decimalsToNumbers(sale)).toEqual({ id: 's1', grand_total: 26180, items: [{ total: 22000, quantity: 2 }] });
  });

  it('convierte resultados de aggregate', () => {
    expect(decimalsToNumbers({ _sum: { amount: d('10.10') } })).toEqual({ _sum: { amount: 10.1 } });
  });

  it('deja intactos fechas, null y primitivos', () => {
    const date = new Date('2026-11-02T00:00:00Z');
    const result = decimalsToNumbers({ created_at: date, note: null, name: 'Ana', n: 3, ok: true });
    expect(result.created_at).toBe(date);
    expect(result).toMatchObject({ note: null, name: 'Ana', n: 3, ok: true });
  });

  it('el resultado se serializa a JSON como número, no como texto', () => {
    expect(JSON.stringify(decimalsToNumbers({ amount: d('99.90') }))).toBe('{"amount":99.9}');
  });
});
