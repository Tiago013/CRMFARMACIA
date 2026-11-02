// Adherencia a partir de las fechas de compra de un paciente.
//
// Un paciente crónico adherente recompra con un ritmo estable y no se atrasa.
// score = 60 % puntualidad (¿ya pasó su fecha esperada de recompra?)
//       + 40 % regularidad (¿qué tan parecidos son los intervalos entre compras?)

const DAY = 86_400_000;

export type Adherence = {
  score: number | null;            // 0–100; null con menos de 2 compras
  avgIntervalDays: number | null;  // días promedio entre compras
  daysSinceLast: number | null;
  purchases: number;
};

export function purchaseAdherence(purchaseDates: (Date | string)[], now: Date = new Date()): Adherence {
  // Varias ventas el mismo día cuentan como una sola visita
  const days = [...new Set(purchaseDates.map((d) => Math.floor(new Date(d).getTime() / DAY)))].sort((a, b) => a - b);
  const today = Math.floor(now.getTime() / DAY);
  const daysSinceLast = days.length ? today - days[days.length - 1] : null;

  if (days.length < 2) {
    return { score: null, avgIntervalDays: null, daysSinceLast, purchases: days.length };
  }

  const intervals = days.slice(1).map((d, i) => d - days[i]);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((acc, x) => acc + (x - avg) ** 2, 0) / intervals.length;
  // Con un solo intervalo no se sabe si el ritmo es estable: regularidad neutra
  const regularity = intervals.length < 2 ? 0.5 : Math.max(0, 1 - Math.sqrt(variance) / avg);

  const overdue = Math.max(0, (daysSinceLast ?? 0) - avg);
  const timeliness = Math.max(0, 1 - overdue / avg);

  return {
    score: Math.round(100 * (0.6 * timeliness + 0.4 * regularity)),
    avgIntervalDays: Math.round(avg),
    daysSinceLast,
    purchases: days.length,
  };
}

// Compras en los últimos N días contra los N días anteriores
export function recentPurchaseCounts(purchaseDates: (Date | string)[], now: Date = new Date(), windowDays = 90) {
  const t = now.getTime();
  let current = 0;
  let previous = 0;
  for (const d of purchaseDates) {
    const age = (t - new Date(d).getTime()) / DAY;
    if (age < 0) continue;
    if (age < windowDays) current++;
    else if (age < windowDays * 2) previous++;
  }
  return { current, previous };
}
