// Pronóstico de demanda diaria: nivel + tendencia amortiguada + estacionalidad
// semanal. Determinista (mismos datos → mismo resultado) y auditable: el error
// se mide prediciendo la última semana con los datos anteriores.

export type DailyPoint = { date: string; value: number };
export type ForecastPoint = DailyPoint & { lower_bound: number; upper_bound: number };

const DAY = 86_400_000;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const dow = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * DAY).toISOString().split('T')[0];

export type Model = {
  level: number;           // demanda diaria base (promedio de las últimas 2 semanas)
  trend: number;           // cambio por día, amortiguado
  weekday: number[];       // factor por día de la semana (domingo = 0), promedio 1
  residualStd: number;     // dispersión de los errores dentro de la muestra
};

export function fitModel(history: number[], dates: string[]): Model {
  const overall = mean(history);

  // Factor por día de la semana, mezclado con 1 cuando hay pocos datos
  const weekday = Array.from({ length: 7 }, (_, d) => {
    const values = history.filter((_, i) => dow(dates[i]) === d);
    if (!overall || !values.length) return 1;
    const raw = mean(values) / overall;
    const weight = Math.min(1, values.length / 4); // con 4 semanas se confía del todo
    return weight * raw + (1 - weight) * 1;
  });
  const avgFactor = mean(weekday) || 1;
  const factors = weekday.map((f) => f / avgFactor);

  // Nivel y tendencia sobre la serie sin estacionalidad
  const deseason = history.map((v, i) => (factors[dow(dates[i])] ? v / factors[dow(dates[i])] : v));
  const level = mean(deseason.slice(-14));
  const prevLevel = deseason.length >= 28 ? mean(deseason.slice(-28, -14)) : level;
  const trend = 0.5 * ((level - prevLevel) / 14); // amortiguada a la mitad

  const fitted = history.map((_, i) => level * factors[dow(dates[i])]);
  const residuals = history.map((v, i) => v - fitted[i]).slice(-28);
  const residualStd = Math.sqrt(mean(residuals.map((r) => r * r)));

  return { level, trend, weekday: factors, residualStd };
}

export function predict(model: Model, lastDate: string, horizon: number): ForecastPoint[] {
  return Array.from({ length: horizon }, (_, h) => {
    const date = addDays(lastDate, h + 1);
    const base = Math.max(0, model.level + model.trend * (h + 1));
    const value = base * model.weekday[dow(date)];
    const margin = 1.28 * model.residualStd * Math.sqrt(1 + h / 7); // ~80 %
    return {
      date,
      value: Math.round(value * 10) / 10,
      lower_bound: Math.max(0, Math.round((value - margin) * 10) / 10),
      upper_bound: Math.round((value + margin) * 10) / 10,
    };
  });
}

export function forecast(history: DailyPoint[], horizon = 15): ForecastPoint[] {
  if (!history.length) return [];
  const model = fitModel(history.map((h) => h.value), history.map((h) => h.date));
  return predict(model, history[history.length - 1].date, horizon);
}

// Error del modelo: se entrena sin los últimos `holdout` días y se comparan con
// lo que realmente se vendió. WAPE = Σ|real − pronóstico| / Σ real (robusto con
// días en cero, a diferencia del MAPE). null si no hubo ventas que comparar.
export function backtest(history: DailyPoint[], holdout = 7) {
  if (history.length < holdout + 14) return null;
  const train = history.slice(0, -holdout);
  const actual = history.slice(-holdout);
  const predicted = forecast(train, holdout);
  const totalActual = actual.reduce((acc, d) => acc + d.value, 0);
  if (totalActual === 0) return null;
  const absError = actual.reduce((acc, d, i) => acc + Math.abs(d.value - predicted[i].value), 0);
  return {
    wape: absError / totalActual,
    mae: absError / holdout,
    actual: actual.map((d, i) => ({ date: d.date, actual: d.value, predicted: predicted[i].value })),
  };
}

// Días con ventas muy por encima de lo normal (media + 3 desviaciones)
export function findSpikes(history: DailyPoint[]): DailyPoint[] {
  const values = history.map((h) => h.value);
  const m = mean(values);
  const sd = Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
  return sd === 0 ? [] : history.filter((h) => h.value > m + 3 * sd);
}
