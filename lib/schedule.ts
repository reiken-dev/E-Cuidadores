// Lógica de agenda: qué dosis tocan cada día, cuál es la próxima, adherencia y recordatorios.
// Funciones puras: el "ahora" siempre entra como parámetro (nowMs).

import {
  addDays,
  atTime,
  diffDays,
  fmtTime,
  keyFromMs,
  timeFromMs,
  weekday,
  DIAS,
  DIAS_CORTOS,
} from './dates';
import type { Appt, AppData, DoseLog, Freq, Med, Member } from './types';

/** Pasado este margen sin confirmar, la dosis se marca como atrasada. */
export const GRACE_MS = 15 * 60000;

export function doseKey(medId: string, date: string, time: string): string {
  return `${medId}|${date}|${time}`;
}

export function scheduledOn(med: Med, k: string): boolean {
  const f = med.freq;
  if (f.kind === 'daily') return true;
  if (f.kind === 'weekdays') return f.days.includes(weekday(k));
  const diff = diffDays(f.anchor, k);
  return diff >= 0 && diff % f.every === 0;
}

export type DoseStatus = 'dada' | 'omitida' | 'pendiente' | 'atrasada';

export interface DoseInstance {
  key: string;
  med: Med;
  date: string;
  time: string;
  at: number;
  log?: DoseLog;
  status: DoseStatus;
}

function logIndex(doses: DoseLog[]): Map<string, DoseLog> {
  const map = new Map<string, DoseLog>();
  for (const d of doses) map.set(doseKey(d.medId, d.date, d.time), d);
  return map;
}

export function dosesOn(data: AppData, k: string, nowMs: number): DoseInstance[] {
  const idx = logIndex(data.doses);
  const out: DoseInstance[] = [];
  for (const med of data.meds) {
    // Horario vigente: solo se EXIGE lo que cae después de startAt/scheduleFrom y con la medicina activa.
    // Lo que ya se registró con un horario anterior se conserva como historial (no se reescribe el pasado).
    const desde = Math.max(med.startAt, med.scheduleFrom ?? 0);
    const vigentes = !med.paused && scheduledOn(med, k) ? med.times : [];
    const horas = new Set<string>(vigentes);
    for (const l of data.doses) if (l.medId === med.id && l.date === k) horas.add(l.time);
    for (const time of horas) {
      const at = atTime(k, time);
      const key = doseKey(med.id, k, time);
      const log = idx.get(key);
      if (!log && (at < desde || !vigentes.includes(time))) continue;
      const status: DoseStatus = log ? (log.skipped ? 'omitida' : 'dada') : at < nowMs - GRACE_MS ? 'atrasada' : 'pendiente';
      out.push({ key, med, date: k, time, at, log, status });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name));
}

export interface NextDoseInfo {
  today: DoseInstance[];
  pending: DoseInstance[];
  next: DoseInstance | null; // próxima dosis de HOY sin confirmar
  upcoming: DoseInstance | null; // si hoy está todo al día: la primera de los próximos días
  done: number; // dosis dadas hoy (las omitidas se cuentan aparte)
  skipped: number;
  total: number;
}

export function nextDoseInfo(data: AppData, nowMs: number): NextDoseInfo {
  const todayK = keyFromMs(nowMs);
  const today = dosesOn(data, todayK, nowMs);
  const pending = today.filter((d) => !d.log);
  let upcoming: DoseInstance | null = null;
  if (pending.length === 0) {
    for (let i = 1; i <= 14 && !upcoming; i++) {
      upcoming = dosesOn(data, addDays(todayK, i), nowMs)[0] ?? null;
    }
  }
  return {
    today,
    pending,
    next: pending[0] ?? null,
    upcoming,
    done: today.filter((d) => d.log && !d.log.skipped).length,
    skipped: today.filter((d) => d.log?.skipped).length,
    total: today.length,
  };
}

/** Un dato para cada día: cuántas dosis tocaban y cuántas se confirmaron. */
export function dayStats(data: AppData, k: string, nowMs: number): { expected: number; done: number; skipped: number } {
  let expected = 0;
  let done = 0;
  let skipped = 0;
  for (const d of dosesOn(data, k, nowMs)) {
    if (d.log) {
      expected++;
      if (d.log.skipped) skipped++;
      else done++;
    } else if (d.at < nowMs - GRACE_MS) expected++;
  }
  return { expected, done, skipped };
}

export interface Adherence {
  expected: number;
  done: number;
  /** Dosis anotadas como NO dadas (con motivo): cuentan como esperadas, no como dadas. */
  skipped: number;
  pct: number | null;
}

export function adherence(data: AppData, days: number, nowMs: number, medId?: string): Adherence {
  const todayK = keyFromMs(nowMs);
  const scoped: AppData = medId ? { ...data, meds: data.meds.filter((m) => m.id === medId) } : data;
  let expected = 0;
  let done = 0;
  let skipped = 0;
  for (let i = 0; i < days; i++) {
    const s = dayStats(scoped, addDays(todayK, -i), nowMs);
    expected += s.expected;
    done += s.done;
    skipped += s.skipped;
  }
  return { expected, done, skipped, pct: expected > 0 ? Math.round((done / expected) * 100) : null };
}

/** Quién le toca a esta medicina ese día: el asignado o, si no hay, turno rotativo entre hermanos. */
export function giverFor(med: Med, dateK: string, members: Member[]): Member | null {
  if (med.giverId) return members.find((m) => m.id === med.giverId) ?? members[0] ?? null;
  if (members.length === 0) return null;
  return members[Math.abs(diffDays('2024-01-01', dateK)) % members.length];
}

export function nameOf(data: AppData, id: string): string {
  if (id === 'self') return data.profile.name;
  return data.members.find((m) => m.id === id)?.name ?? 'Alguien de la familia';
}

export function freqLabel(f: Freq): string {
  if (f.kind === 'daily') return 'Todos los días';
  if (f.kind === 'interval') return f.every === 1 ? 'Todos los días' : `Cada ${f.every} días`;
  const days = [...f.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // lunes primero
  if (days.length === 7) return 'Todos los días';
  const names = days.map((d) => DIAS_CORTOS[d]);
  if (names.length === 1) {
    const dia = DIAS[days[0]];
    return `Los ${dia}${dia.endsWith('s') ? '' : 's'}`; // lunes, martes… pero domingos y sábados
  }
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Cuánto falta para la cita, en lenguaje humano. */
export function daysUntilLabel(apptDate: string, todayK: string): string {
  const d = diffDays(todayK, apptDate);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d > 1) return `En ${d} días`;
  if (d === -1) return 'Ayer';
  return `Hace ${-d} días`;
}

export type ApptTone = 'neutral' | 'amber' | 'red' | 'done' | 'muted';

/** Color por cercanía: neutro lejos, ámbar en 1 a 3 días, rojo suave hoy o pasada sin cerrar. */
export function apptTone(a: Appt, todayK: string, nowMs: number): ApptTone {
  if (a.status === 'atendida') return 'done';
  if (a.status === 'cancelada') return 'muted';
  const d = diffDays(todayK, a.date);
  if (d < 0 || (d === 0 && atTime(a.date, a.time) < nowMs)) return 'red';
  if (d === 0) return 'red';
  if (d <= 3) return 'amber';
  return 'neutral';
}

/** "el miércoles 6:00 PM y 3 h antes" — texto de los avisos programados. */
export function reminderText(a: Appt): string | null {
  const parts: string[] = [];
  if (a.remindDayBefore) {
    const before = addDays(a.date, -1);
    parts.push(`el ${DIAS[weekday(before)]} ${fmtTime('18:00')}`);
  }
  if (a.remindHoursBefore > 0) {
    const t = timeFromMs(atTime(a.date, a.time) - a.remindHoursBefore * 3600000);
    parts.push(`${a.remindHoursBefore} h antes (${fmtTime(t)})`);
  }
  if (parts.length === 0) return null;
  return `Aviso configurado: ${parts.join(' y ')}. El envío real se activa al conectar el servicio.`;
}
