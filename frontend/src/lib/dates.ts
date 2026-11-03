// Días calendario en la hora de la farmacia (Colombia, UTC−5 sin horario de
// verano). Agrupar por toISOString() usa UTC y manda al día siguiente toda
// venta hecha después de las 7 p. m.

export const PHARMACY_TZ = 'America/Bogota';

const formatters = new Map<string, Intl.DateTimeFormat>();

// 'YYYY-MM-DD' del día local en que ocurrió `date`
export function localDay(date: Date | string, timeZone = PHARMACY_TZ): string {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(timeZone, f);
  }
  return f.format(new Date(date));
}

// Suma `n` días a un 'YYYY-MM-DD' (aritmética de calendario, sin zona horaria)
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().split('T')[0];
}
