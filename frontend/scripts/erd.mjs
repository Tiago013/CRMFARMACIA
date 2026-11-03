// Genera docs/modelo-datos.md desde prisma/schema.prisma: un diagrama
// entidad-relación en Mermaid (GitHub lo dibuja) y la lista de campos por tabla.
//
//   npm run docs:erd
//
// tests/unit/erd.test.ts falla si el documento quedó desactualizado.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCALARS = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes']);

export function parseSchema(schema) {
  const models = [];
  for (const [, name, body] of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const table = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? name;
    const fields = [];
    const relations = [];
    for (const raw of body.split('\n')) {
      const line = raw.replace(/\/\/.*$/, '').trim();
      const m = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
      if (!m || line.startsWith('@@')) continue;
      const [, field, type, list, optional, attrs] = m;
      if (SCALARS.has(type)) {
        fields.push({ name: field, type, optional: !!optional, pk: attrs.includes('@id'), unique: attrs.includes('@unique') });
      } else if (!list) {
        const fk = attrs.match(/fields:\s*\[([^\]]+)\]/)?.[1].split(',').map((s) => s.trim());
        if (fk) relations.push({ field, target: type, fk, optional: !!optional });
      }
    }
    models.push({ name, table, fields, relations });
  }
  return models;
}

export function buildErd(schema) {
  const models = parseSchema(schema);
  const byName = new Map(models.map((m) => [m.name, m]));
  const fkOf = (m) => new Set(m.relations.flatMap((r) => r.fk));

  const lines = ['erDiagram'];
  for (const m of models) {
    const fks = fkOf(m);
    // En el diagrama solo las claves; la lista completa va en la tabla de abajo
    const keys = m.fields.filter((f) => f.pk || f.unique || fks.has(f.name) || f.name === 'tenant_id');
    lines.push(`  ${m.table} {`);
    for (const f of keys) {
      const tag = f.pk ? ' PK' : fks.has(f.name) ? ' FK' : f.unique ? ' UK' : '';
      lines.push(`    ${f.type} ${f.name}${tag}`);
    }
    lines.push('  }');
  }
  for (const m of models) {
    for (const r of m.relations) {
      const target = byName.get(r.target);
      if (!target) continue;
      lines.push(`  ${target.table} ${r.optional ? '|o' : '||'}--o{ ${m.table} : "${r.fk.join(', ')}"`);
    }
  }

  const tables = models.map((m) => {
    const fks = fkOf(m);
    const rows = m.fields.map((f) => {
      const notes = [f.pk && 'clave primaria', fks.has(f.name) && 'clave foránea', f.unique && 'única', f.optional && 'opcional'].filter(Boolean).join(', ');
      return `| \`${f.name}\` | ${f.type} | ${notes} |`;
    });
    return `### \`${m.table}\`\n\n| Campo | Tipo | Notas |\n|---|---|---|\n${rows.join('\n')}`;
  });

  return `# Modelo de datos

> Generado desde \`frontend/prisma/schema.prisma\` con \`npm run docs:erd\`. No editar a mano.

${models.length} tablas. Todas las de negocio llevan \`tenant_id\`: cada farmacia solo ve sus filas
(ver [ADR 0002](adr/0002-multi-tenant-rls.md)). El diagrama muestra las claves; la lista completa
de campos está debajo.

\`\`\`mermaid
${lines.join('\n')}
\`\`\`

## Campos por tabla

${tables.join('\n\n')}
`;
}

// Ejecutado directamente: escribe el documento
const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const schema = readFileSync(resolve(here, '../prisma/schema.prisma'), 'utf8');
  writeFileSync(resolve(here, '../../docs/modelo-datos.md'), buildErd(schema));
  console.log('docs/modelo-datos.md actualizado');
}
