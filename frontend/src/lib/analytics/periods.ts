// Periodos del dashboard y comparación contra el periodo anterior de igual duración.

export type Period = '7d' | 'month' | 'quarter' | 'year';

export type DateRange = { start: Date; end: Date };

// Rango actual [start, end) y el inmediatamente anterior con la misma duración
export function periodRanges(period: string, now = new Date()): { current: DateRange; previous: DateRange } {
  const start = new Date(now);
  if (period === 'month') start.setMonth(now.getMonth() - 1);
  else if (period === 'quarter') start.setMonth(now.getMonth() - 3);
  else if (period === 'year') start.setFullYear(now.getFullYear() - 1);
  else start.setDate(now.getDate() - 7);

  const length = now.getTime() - start.getTime();
  return {
    current: { start, end: now },
    previous: { start: new Date(start.getTime() - length), end: start },
  };
}

export type Trend = {
  change: string;          // "12%", "nuevo" o "0%"
  trend: 'up' | 'down' | 'flat';
  good: boolean;           // para el color: subir gastos no es bueno
};

// Variación porcentual; higherIsBetter=false para métricas de costo
export function compareToPrevious(current: number, previous: number, higherIsBetter = true): Trend {
  if (previous === 0) {
    if (current === 0) return { change: '0%', trend: 'flat', good: true };
    return { change: 'nuevo', trend: 'up', good: higherIsBetter };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return { change: '0%', trend: 'flat', good: true };
  const trend = rounded > 0 ? 'up' : 'down';
  return { change: `${Math.abs(rounded)}%`, trend, good: (trend === 'up') === higherIsBetter };
}

// Todos los días del rango como 'YYYY-MM-DD', para que la gráfica no salte días sin ventas
export function daysInRange({ start, end }: DateRange): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  while (cursor <= end) {
    days.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
