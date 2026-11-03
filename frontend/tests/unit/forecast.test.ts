import { describe, expect, it } from 'vitest';
import { backtest, findSpikes, fitModel, forecast } from '@/lib/analytics/forecast';

// Serie diaria desde un lunes (2026-09-07) con patrón semanal
function series(days: number, fn: (i: number, dow: number) => number) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.UTC(2026, 8, 7 + i, 12)).toISOString().split('T')[0];
    return { date, value: fn(i, new Date(`${date}T12:00:00Z`).getUTCDay()) };
  });
}

describe('forecast', () => {
  it('es determinista: mismos datos, mismo resultado', () => {
    const h = series(56, (i, d) => (d === 6 ? 20 : 10) + (i % 3));
    expect(forecast(h)).toEqual(forecast(h));
  });

  it('aprende la estacionalidad semanal: los sábados se vende más', () => {
    const h = series(56, (_, d) => (d === 6 ? 30 : 10));
    const f = forecast(h, 14);
    const saturdays = f.filter((p) => new Date(`${p.date}T12:00:00Z`).getUTCDay() === 6);
    const weekdays = f.filter((p) => new Date(`${p.date}T12:00:00Z`).getUTCDay() === 2);
    expect(saturdays[0].value).toBeGreaterThan(weekdays[0].value * 2);
  });

  it('una demanda constante se pronostica constante y con banda estrecha', () => {
    const f = forecast(series(28, () => 5), 5);
    expect(f.every((p) => p.value === 5)).toBe(true);
    expect(f[0].upper_bound - f[0].lower_bound).toBe(0);
  });

  it('sigue una tendencia al alza (amortiguada)', () => {
    const f = forecast(series(56, (i) => 10 + i * 0.5), 10);
    expect(f[9].value).toBeGreaterThan(f[0].value);
  });

  it('nunca pronostica ventas negativas', () => {
    const f = forecast(series(56, (i) => Math.max(0, 40 - i)), 15);
    expect(f.every((p) => p.value >= 0 && p.lower_bound >= 0)).toBe(true);
  });

  it('sin historial no pronostica', () => {
    expect(forecast([])).toEqual([]);
  });

  it('las fechas siguen al último día del historial', () => {
    const f = forecast(series(28, () => 3), 3);
    expect(f.map((p) => p.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });
});

describe('fitModel', () => {
  it('los factores semanales promedian 1', () => {
    const h = series(56, (_, d) => (d === 0 ? 2 : 12));
    const m = fitModel(h.map((x) => x.value), h.map((x) => x.date));
    expect(m.weekday.reduce((a, b) => a + b, 0) / 7).toBeCloseTo(1, 5);
  });
});

describe('backtest', () => {
  it('error casi nulo cuando el patrón es perfectamente regular', () => {
    const r = backtest(series(56, (_, d) => (d === 6 ? 30 : 10)));
    expect(r!.wape).toBeLessThan(0.05);
    expect(r!.actual).toHaveLength(7);
  });

  it('error alto cuando la última semana rompe el patrón', () => {
    const r = backtest(series(56, (i) => (i >= 49 ? 50 : 10)));
    expect(r!.wape).toBeGreaterThan(0.5);
  });

  it('null si no hay suficiente historia o la última semana no tuvo ventas', () => {
    expect(backtest(series(10, () => 1))).toBeNull();
    expect(backtest(series(56, (i) => (i >= 49 ? 0 : 4)))).toBeNull();
  });
});

describe('findSpikes', () => {
  it('detecta un pico aislado', () => {
    const h = series(28, (i) => (i === 20 ? 100 : 5));
    expect(findSpikes(h).map((p) => p.value)).toEqual([100]);
  });

  it('sin variación no hay picos', () => {
    expect(findSpikes(series(28, () => 5))).toEqual([]);
  });
});
