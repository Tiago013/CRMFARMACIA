import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: script de Node en JavaScript, sin tipos
import { buildErd, parseSchema } from '../../scripts/erd.mjs';

const schema = readFileSync(resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');

describe('diagrama del modelo de datos', () => {
  it('docs/modelo-datos.md está al día con schema.prisma (si falla: npm run docs:erd)', () => {
    const doc = readFileSync(resolve(__dirname, '../../../docs/modelo-datos.md'), 'utf8');
    expect(doc.replace(/\r\n/g, '\n')).toBe(buildErd(schema));
  });

  it('lee modelos, claves foráneas y relaciones opcionales', () => {
    const models = parseSchema(`
model Venta {
  id         String  @id
  cliente_id String?
  cliente    Cliente? @relation(fields: [cliente_id], references: [id])
  @@map("ventas")
}
model Cliente {
  id     String  @id
  correo String  @unique
  ventas Venta[]
}`);
    expect(models.map((m: { table: string }) => m.table)).toEqual(['ventas', 'Cliente']);
    expect(models[0].relations).toEqual([{ field: 'cliente', target: 'Cliente', fk: ['cliente_id'], optional: true }]);
    expect(models[1].fields.find((f: { name: string }) => f.name === 'correo').unique).toBe(true);
  });
});
