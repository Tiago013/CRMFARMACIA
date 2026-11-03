import { describe, expect, it } from 'vitest';
import { formatCell, inferColumns, prettifyKey, safeFilename, sheetNames } from '@/lib/reports/table';
import { buildZReport, longDate, zReportDocument, type ZSale } from '@/lib/reports/zReport';

describe('columnas de reportes', () => {
  it('convierte las claves en encabezados legibles', () => {
    expect(prettifyKey('Ingresos_Totales')).toBe('Ingresos totales');
    expect(prettifyKey('Valor_De_Vida_LTV')).toBe('Valor de vida LTV');
    expect(prettifyKey('SKU')).toBe('SKU');
  });

  it('distingue pesos, cantidades, fechas y texto', () => {
    const cols = inferColumns([{ Producto: 'A', Unidades_Vendidas: 12, Ingresos_Totales: 5000, Compras_Totales: 3, Ultima_Compra: '2026-11-02' }]);
    expect(cols.map((c) => c.format)).toEqual(['text', 'number', 'money', 'number', 'date']);
  });

  it('usa la primera fila con valor para decidir el formato', () => {
    expect(inferColumns([{ Ingresos: null }, { Ingresos: 10 }])[0].format).toBe('money');
  });

  it('formatea como en Colombia', () => {
    expect(formatCell(1234567.6, 'money')).toBe('$1.234.568');
    expect(formatCell(1234.5, 'number')).toBe('1.234,5');
    expect(formatCell('2026-11-02', 'date')).toBe('02/11/2026');
    expect(formatCell(null, 'money')).toBe('');
  });

  it('nombres de hoja válidos y sin repetir', () => {
    expect(sheetNames(['Ventas: día/noche', 'Ventas: día/noche', 'x'.repeat(40)])).toEqual(['Ventas  día noche', 'Ventas  día noche 2', 'x'.repeat(31)]);
  });

  it('nombres de archivo sin tildes ni espacios', () => {
    expect(safeFilename('Reporte Z · Cierre del día')).toBe('reporte_z_cierre_del_dia');
  });
});

const sale = (over: Partial<ZSale>): ZSale => ({
  id: 'x', status: 'COMPLETED', payment_method: 'cash', subtotal: 100, discount_total: 0, tax_total: 19, grand_total: 119,
  created_at: '2026-11-02T14:00:00Z', items: [{ quantity: 1, total: 119, name: 'A' }], ...over,
});

describe('reporte Z', () => {
  const z = buildZReport('2026-11-02', [
    sale({ id: '1', created_at: '2026-11-02T13:05:00Z' }),                                   // 8:05 a. m.
    sale({ id: '2', payment_method: 'CASH', items: [{ quantity: 2, total: 119, name: 'B' }] }),
    sale({ id: '3', payment_method: 'card', subtotal: 200, tax_total: 38, grand_total: 238, created_at: '2026-11-02T23:30:00Z', items: [{ quantity: 1, total: 238, name: 'A' }] }),
    sale({ id: '4', status: 'REFUNDED', grand_total: 500 }),
  ], [
    { status: 'CLOSED', opened_at: '2026-11-02T13:00:00Z', closed_at: '2026-11-02T23:45:00Z', opening_amount: 50000, cash_sales: 238, expected_amount: 50238, counted_amount: 50200, difference: -38 },
  ]);

  it('suma solo las ventas completadas y separa las devoluciones', () => {
    expect(z.salesCount).toBe(3);
    expect(z.total).toBe(476);
    expect(z.tax).toBe(76);
    expect(z.averageTicket).toBeCloseTo(158.67, 2);
    expect(z.refunds).toEqual({ count: 1, total: 500 });
  });

  it('agrupa el efectivo antiguo (CASH) con el nuevo (cash)', () => {
    expect(z.byMethod).toEqual([
      { method: 'cash', count: 2, total: 238, label: 'Efectivo' },
      { method: 'card', count: 1, total: 238, label: 'Tarjeta' },
    ]);
  });

  it('muestra las horas en hora de Colombia', () => {
    expect(z.firstSale).toBe('08:05');
    expect(z.lastSale).toBe('18:30');
    expect(z.sessions[0]).toMatchObject({ status: 'Cerrado', opened: '08:00', closed: '18:45', difference: -38 });
  });

  it('ordena los productos por unidades', () => {
    expect(z.topProducts.map((p) => [p.name, p.units])).toEqual([['A', 2], ['B', 2]]);
  });

  it('un día sin ventas no rompe nada', () => {
    const empty = buildZReport('2026-11-01', [], []);
    expect(empty).toMatchObject({ salesCount: 0, total: 0, averageTicket: 0, firstSale: null, byMethod: [], sessions: [] });
  });

  it('el documento exportable trae resumen y tres tablas', () => {
    const doc = zReportDocument(z, 'Droguería Demo');
    expect(doc.filename).toBe('reporte_z_2026-11-02');
    expect(doc.subtitle).toBe(`Droguería Demo · ${longDate('2026-11-02')}`);
    expect(doc.summary).toContainEqual(['Total vendido', '$476']);
    expect(doc.tables.map((t) => t.title)).toEqual(['Por medio de pago', 'Turnos de caja', 'Productos más vendidos']);
  });
});
