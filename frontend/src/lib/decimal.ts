import { Prisma } from '@prisma/client';

// La base guarda los montos como NUMERIC (exacto). Prisma los devuelve como
// Decimal, que al pasar a JSON se vuelve texto ("1234.5") y rompe sumas y
// formatos en el navegador. Esta función los convierte a number en cada
// resultado; el valor ya viene redondeado a centavos desde la base.
export function decimalsToNumbers<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Prisma.Decimal.isDecimal(value)) return (value as unknown as Prisma.Decimal).toNumber() as T;
  if (value instanceof Date || value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return value.map(decimalsToNumbers) as T;

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) record[key] = decimalsToNumbers(record[key]);
  return value;
}
