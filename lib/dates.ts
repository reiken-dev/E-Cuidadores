// Utilidades de fecha y hora en español. Todo es determinista (sin Intl) para que el
// texto sea idéntico en servidor y cliente. Las fechas se guardan como 'YYYY-MM-DD'
// (día local) y las horas como 'HH:MM' (24 h); se muestran como "8:00 AM".

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
export const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;
export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

const p2 = (n: number) => String(n).padStart(2, '0');

export function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function keyFromMs(ms: number): string {
  return dateKey(new Date(ms));
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Días de a hasta b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}

export function weekday(k: string): number {
  return parseKey(k).getDay();
}

/** Momento (ms) del día k a la hora hhmm. */
export function atTime(k: string, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const d = parseKey(k);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function timeFromMs(ms: number): string {
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** Baja la hora a un múltiplo de 5 minutos ('09:03' pasa a '09:00'): así nunca queda en el futuro. */
export function floorTo5(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${p2(h)}:${p2(m - (m % 5))}`;
}

export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${p2(m)} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
}

export function fmtClock(ms: number): string {
  return fmtTime(timeFromMs(ms));
}

export function fmtLongDate(k: string): string {
  const d = parseKey(k);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function fmtShortDate(k: string): string {
  const d = parseKey(k);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

export function fmtDayMonth(k: string): string {
  const d = parseKey(k);
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function monthLabel(year: number, month: number): string {
  return `${cap(MESES[month])} ${year}`;
}

export function relativeDay(k: string, todayK: string): string {
  const diff = diffDays(todayK, k);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  return cap(fmtLongDate(k));
}

/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días". */
export function fmtAgo(ms: number, nowMs: number): string {
  const min = Math.max(0, Math.round((nowMs - ms) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = diffDays(keyFromMs(ms), keyFromMs(nowMs));
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

/** Acepta "8", "8:30", "8am", "8:00 AM", "2 p.m.", "14:30". Devuelve 'HH:MM' o null. */
export function parseTimeInput(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  const m = /^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${p2(h)}:${p2(min)}`;
}
