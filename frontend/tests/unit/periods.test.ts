import { describe, expect, it } from 'vitest';
import { compareToPrevious, daysInRange, periodRanges } from '@/lib/analytics/periods';

const now = new Date('2026-11-02T15:00:00Z');

describe('periodRanges', () => {
  it('7 días: el periodo anterior son los 7 días previos', () => {
    const { current, previous } = periodRanges('7d', now);
    expect(current.end).toEqual(now);
    expect(current.start.toISOString()).toBe('2026-10-26T15:00:00.000Z');
    expect(previous.end).toEqual(current.start);
    expect(previous.start.toISOString()).toBe('2026-10-19T15:00:00.000Z');
  });

  it.each(['month', 'quarter', 'year'])('%s: ambos periodos duran lo mismo', (period) => {
    const { current, previous } = periodRanges(period, now);
    const len = (r: { start: Date; end: Date }) => r.end.getTime() - r.start.getTime();
    expect(len(previous)).toBe(len(current));
    expect(previous.end).toEqual(current.start);
  });

  it('un periodo desconocido usa 7 días', () => {
    expect(periodRanges('xyz', now).current.start.toISOString()).toBe('2026-10-26T15:00:00.000Z');
  });
});

describe('compareToPrevious', () => {
  it('calcula la subida porcentual', () => {
    expect(compareToPrevious(115, 100)).toEqual({ change: '15%', trend: 'up', good: true });
  });

  it('calcula la bajada porcentual', () => {
    expect(compareToPrevious(80, 100)).toEqual({ change: '20%', trend: 'down', good: false });
  });

  it('en gastos, bajar es bueno', () => {
    expect(compareToPrevious(80, 100, false)).toMatchObject({ trend: 'down', good: true });
    expect(compareToPrevious(120, 100, false)).toMatchObject({ trend: 'up', good: false });
  });

  it('sin periodo anterior marca "nuevo"', () => {
    expect(compareToPrevious(50, 0)).toEqual({ change: 'nuevo', trend: 'up', good: true });
  });

  it('cero contra cero no cambia', () => {
    expect(compareToPrevious(0, 0)).toEqual({ change: '0%', trend: 'flat', good: true });
  });

  it('variaciones menores al 0,5 % cuentan como estables', () => {
    expect(compareToPrevious(1002, 1000).trend).toBe('flat');
  });

  it('funciona con utilidades negativas en el periodo anterior', () => {
    expect(compareToPrevious(50, -100)).toMatchObject({ change: '150%', trend: 'up' });
  });
});

describe('daysInRange', () => {
  it('incluye cada día del rango, también los días sin ventas', () => {
    const days = daysInRange({ start: new Date('2026-10-30T10:00:00Z'), end: new Date('2026-11-02T09:00:00Z') });
    expect(days).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
});
