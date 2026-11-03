// Modelo común de los reportes exportables (Excel y PDF): columnas con formato
// y filas. Puro, sin dependencias, para probarlo y compartirlo entre exportadores.

export type CellFormat = 'money' | 'number' | 'date' | 'text';

export type ReportColumn = { key: string; header: string; format: CellFormat };

export type ReportTable = {
  title?: string;
  columns: ReportColumn[];
  rows: object[];
};

// Valor de una fila por clave (las filas pueden ser de cualquier tipo de objeto)
export const cellValue = (row: object, key: string): unknown => (row as Record<string, unknown>)[key];

export type ReportDocument = {
  filename: string;            // sin extensión
  title: string;
  subtitle?: string;
  summary?: [string, string][]; // pares etiqueta → valor ya formateado
  tables: ReportTable[];
};

// Columnas en pesos según el nombre (los reportes devuelven claves como Ingresos_Totales)
// ("Compras_Totales" es una cantidad: por eso no basta con buscar "total")
const MONEY_KEY = /(ingreso|utilidad|valor|capital|ventas_totales|ticket|margen_bruto|monto|precio|costo)/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;

// "Ingresos_Totales" → "Ingresos totales"; "Valor_De_Vida_LTV" → "Valor de vida LTV"
export function prettifyKey(key: string): string {
  const words = key.split(/[_\s]+/).filter(Boolean);
  return words
    .map((w, i) => (w.length > 1 && w === w.toUpperCase() ? w : i === 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(' ');
}

export function inferColumns(rows: object[]): ReportColumn[] {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((key) => {
    const sample = rows.map((r) => cellValue(r, key)).find((v) => v !== null && v !== undefined && v !== '');
    let format: CellFormat = 'text';
    if (typeof sample === 'number') format = MONEY_KEY.test(key) ? 'money' : 'number';
    else if (typeof sample === 'string' && ISO_DATE.test(sample)) format = 'date';
    return { key, header: prettifyKey(key), format };
  });
}

const intFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const numFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export function formatMoney(value: number): string {
  return `$${intFormat.format(Math.round(value))}`;
}

// Texto para el PDF y la pantalla
export function formatCell(value: unknown, format: CellFormat): string {
  if (value === null || value === undefined || value === '') return '';
  if (format === 'money' && typeof value === 'number') return formatMoney(value);
  if (format === 'number' && typeof value === 'number') return numFormat.format(value);
  if (format === 'date' && typeof value === 'string' && ISO_DATE.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return String(value);
}

// Nombre de hoja de Excel: máximo 31 caracteres, sin : \ / ? * [ ] y sin repetir
export function sheetNames(titles: string[]): string[] {
  const used = new Set<string>();
  return titles.map((t, i) => {
    const base = (t || `Hoja ${i + 1}`).replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || `Hoja ${i + 1}`;
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base.slice(0, 31 - String(n).length - 1)} ${n}`;
    used.add(name.toLowerCase());
    return name;
  });
}

// Nombre de archivo seguro: minúsculas, sin tildes ni espacios
export function safeFilename(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9-]+/g, '_').replace(/^_+|_+$/g, '') || 'reporte';
}
