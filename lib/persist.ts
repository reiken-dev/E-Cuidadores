// Lectura SEGURA de lo guardado en el navegador. Función pura (sin window ni localStorage) para
// poder probarla: recibe el texto guardado y devuelve datos válidos o null.
//
// Regla: lo guardado NUNCA puede romper la app. Si el texto no es JSON, es de otra versión o no
// tiene la forma esperada, se devuelve null y el store usa los datos de ejemplo. Si solo algunas
// piezas están dañadas (una medicina sin horarios, una cita sin fecha), se descartan esas piezas y
// se conserva el resto. Nada de lo que hay aquí guarda contraseñas ni datos de acceso.
//
// PARA EL COMPRADOR: al cambiar la forma de AppData, sube CURRENT_VERSION y agrega el paso en
// MIGRATIONS (de la versión N a la N+1) para no perder los datos de quien ya usa la app.

import type {
  Appt,
  ApptStatus,
  AppData,
  DoseLog,
  Freq,
  Med,
  Member,
  MemberTone,
  Note,
  NoteKind,
  Plan,
  Profile,
  RemindHours,
  Settings,
  SeedOptions,
} from './types';
import { SKIP_REASONS } from './types';
import { CODIGO_CIRCULO_RE } from './codigo-circulo';

export const CURRENT_VERSION = 1;

/** Pasos de migración: MIGRATIONS[n] convierte datos de la versión n a la n+1. Hoy solo existe la 1. */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {};

type Rec = Record<string, unknown>;

const isRec = (x: unknown): x is Rec => !!x && typeof x === 'object' && !Array.isArray(x);
// Topes de largo: lo guardado en el navegador se puede editar a mano o venir de una versión vieja sin
// límites. Se recorta al leer para que un texto enorme nunca rompa una pantalla ni llene el almacenamiento.
const LIMITS = { name: 80, short: 80, role: 120, notes: 300, title: 120, place: 160, result: 700, note: 600, questions: 800, item: 60 } as const;
const MAX_ITEMS = { members: 12, meds: 100, appts: 500, notes: 1000, doses: 20000, list: 30 } as const;
const str = (x: unknown, fallback = '', max: number = 400): string => (typeof x === 'string' ? x.slice(0, max) : fallback);
const bool = (x: unknown, fallback: boolean): boolean => (typeof x === 'boolean' ? x : fallback);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TONES: MemberTone[] = ['accent', 'indigo', 'green', 'amber'];
const KINDS: NoteKind[] = ['sintoma', 'animo', 'comida', 'otra'];
const STATUSES: ApptStatus[] = ['pendiente', 'atendida', 'cancelada'];

/** Limpia una lista: descarta piezas dañadas, corta al máximo y evita ids repetidos (la primera gana). */
function cleanList<T extends { id?: string }>(x: unknown, one: (v: unknown) => T | null, max: number = 1000): T[] {
  if (!Array.isArray(x)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const v of x) {
    if (out.length >= max) break;
    const c = one(v);
    if (!c) continue;
    if (c.id) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
    }
    out.push(c);
  }
  return out;
}

function cleanMember(v: unknown): Member | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || typeof v.name !== 'string' || !v.name.trim()) return null;
  const tone = TONES.includes(v.tone as MemberTone) ? (v.tone as MemberTone) : 'accent';
  return { id: v.id.slice(0, 80), name: v.name.slice(0, LIMITS.name), role: str(v.role, '', LIMITS.role), tone };
}

function cleanFreq(v: unknown): Freq | null {
  if (!isRec(v)) return null;
  if (v.kind === 'daily') return { kind: 'daily' };
  if (v.kind === 'weekdays' && Array.isArray(v.days)) {
    const days = v.days.filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6);
    return days.length ? { kind: 'weekdays', days } : null;
  }
  if (v.kind === 'interval') {
    const every = num(v.every);
    if (every === null || !Number.isInteger(every) || every < 1 || typeof v.anchor !== 'string' || !DATE_RE.test(v.anchor)) return null;
    return { kind: 'interval', every, anchor: v.anchor };
  }
  return null;
}

function cleanMed(v: unknown): Med | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || typeof v.name !== 'string' || !v.name.trim()) return null;
  const freq = cleanFreq(v.freq);
  const times = Array.isArray(v.times)
    ? [...new Set(v.times.filter((t): t is string => typeof t === 'string' && TIME_RE.test(t)))].slice(0, 12)
    : [];
  if (!freq || times.length === 0) return null;
  return {
    id: v.id.slice(0, 80),
    name: v.name.slice(0, LIMITS.name),
    dose: str(v.dose, '', LIMITS.short),
    times,
    freq,
    notes: str(v.notes, '', LIMITS.notes),
    giverId: typeof v.giverId === 'string' ? v.giverId : null,
    paused: bool(v.paused, false),
    startAt: num(v.startAt) ?? Date.now(), // sin fecha de inicio: no se exigen dosis anteriores a hoy
    ...(num(v.scheduleFrom) ? { scheduleFrom: num(v.scheduleFrom) as number } : {}),
  };
}

function cleanPlan(v: unknown): Plan {
  const base: Plan = { estado: 'activo', tipo: 'mensual', desde: Date.now() };
  if (!isRec(v)) return base;
  return {
    estado: v.estado === 'pago_pendiente' ? 'pago_pendiente' : 'activo',
    tipo: v.tipo === 'anual' ? 'anual' : 'mensual',
    desde: num(v.desde) ?? base.desde,
  };
}

function cleanDose(v: unknown): DoseLog | null {
  if (!isRec(v) || typeof v.medId !== 'string' || typeof v.byId !== 'string' || !v.byId) return null;
  if (typeof v.date !== 'string' || !DATE_RE.test(v.date) || typeof v.time !== 'string' || !TIME_RE.test(v.time)) return null;
  const at = num(v.at);
  if (at === null) return null;
  const skipped = SKIP_REASONS.find((r) => r.id === v.skipped)?.id;
  return { id: str(v.id, `d-${v.medId}|${v.date}|${v.time}`, 200), medId: v.medId, date: v.date, time: v.time, byId: v.byId, at, ...(skipped ? { skipped } : {}) };
}

function cleanAppt(v: unknown): Appt | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || typeof v.title !== 'string') return null;
  if (typeof v.date !== 'string' || !DATE_RE.test(v.date) || typeof v.time !== 'string' || !TIME_RE.test(v.time)) return null;
  const hours = num(v.remindHoursBefore);
  return {
    id: v.id.slice(0, 80),
    title: v.title.slice(0, LIMITS.title),
    specialist: str(v.specialist, '', LIMITS.short),
    date: v.date,
    time: v.time,
    place: str(v.place, '', LIMITS.place),
    attendeeId: typeof v.attendeeId === 'string' ? v.attendeeId : null,
    remindDayBefore: bool(v.remindDayBefore, true),
    remindHoursBefore: (hours !== null && [0, 1, 2, 3, 4].includes(hours) ? hours : 0) as RemindHours,
    status: STATUSES.includes(v.status as ApptStatus) ? (v.status as ApptStatus) : 'pendiente',
    result: str(v.result, '', LIMITS.result),
  };
}

function cleanNote(v: unknown): Note | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || typeof v.text !== 'string' || typeof v.authorId !== 'string') return null;
  const at = num(v.at);
  if (at === null) return null;
  return { id: v.id.slice(0, 80), kind: KINDS.includes(v.kind as NoteKind) ? (v.kind as NoteKind) : 'otra', text: v.text.slice(0, LIMITS.note), authorId: v.authorId, at };
}

function cleanProfile(v: unknown, base: Profile): Profile {
  if (!isRec(v)) return base;
  // Lista de textos (alergias, condiciones): sin vacíos ni repetidos, con tope de cantidad y de largo.
  const list = (x: unknown) =>
    Array.isArray(x)
      ? [...new Set(x.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, LIMITS.item)).filter(Boolean))].slice(0, MAX_ITEMS.list)
      : [];
  const age = num(v.age);
  const allergies = list(v.allergies);
  // La fecha de registro solo tiene sentido con alergias: sin lista, no hay fecha que guardar.
  const allergiesAt = allergies.length && typeof v.allergiesAt === 'string' && DATE_RE.test(v.allergiesAt) ? v.allergiesAt : null;
  return {
    name: typeof v.name === 'string' && v.name.trim() ? v.name.slice(0, LIMITS.name) : base.name,
    age: age !== null && age >= 1 && age <= 120 ? age : null,
    relation: str(v.relation, base.relation, 40),
    allergies,
    ...(allergiesAt ? { allergiesAt } : {}),
    conditions: list(v.conditions),
    doctorName: str(v.doctorName, '', LIMITS.short),
    doctorPhone: str(v.doctorPhone, '', 30),
    emergencyName: str(v.emergencyName, '', LIMITS.short),
    emergencyPhone: str(v.emergencyPhone, '', 30),
  };
}

// Opciones con las que se armó el ejemplo (nombre, hermanos, primera medicina). Solo se aceptan valores con sentido.
function cleanSeedOptions(v: unknown): SeedOptions {
  if (!isRec(v)) return {};
  const out: SeedOptions = {};
  if (typeof v.name === 'string' && v.name.trim()) out.name = v.name.slice(0, LIMITS.name);
  if (typeof v.relation === 'string' && v.relation.trim()) out.relation = v.relation.slice(0, 40);
  const members = num(v.members);
  if (members !== null && Number.isInteger(members) && members >= 1 && members <= MAX_ITEMS.members) out.members = members;
  if (v.firstMed === null) out.firstMed = null;
  else if (isRec(v.firstMed) && typeof v.firstMed.name === 'string' && v.firstMed.name.trim() && typeof v.firstMed.time === 'string' && TIME_RE.test(v.firstMed.time))
    out.firstMed = { name: v.firstMed.name.slice(0, LIMITS.name), time: v.firstMed.time };
  return out;
}

function cleanSettings(v: unknown, base: Settings): Settings {
  const s = isRec(v) ? v : {};
  const hours = num(s.defaultRemindHours);
  return {
    defaultRemindDayBefore: bool(s.defaultRemindDayBefore, base.defaultRemindDayBefore),
    defaultRemindHours: (hours !== null && [0, 1, 2, 3, 4].includes(hours) ? hours : base.defaultRemindHours) as RemindHours,
    // El modo simple es una pantalla, no una preferencia: nunca se restaura al abrir la app.
    simpleMode: false,
  };
}

/**
 * Convierte el texto guardado en datos válidos. Devuelve null si no hay nada aprovechable
 * (texto vacío, JSON dañado, versión desconocida o sin forma de datos). `fallback` aporta los
 * valores por defecto (los datos de ejemplo) para lo que falte.
 */
export function parseStored(raw: string | null, fallback: AppData): AppData | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRec(parsed)) return null;

  let version = typeof parsed.version === 'number' ? parsed.version : NaN;
  if (!Number.isInteger(version) || version < 1 || version > CURRENT_VERSION) return null; // de un futuro desconocido
  let doc: Rec = parsed;
  while (version < CURRENT_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    doc = step(doc);
    version += 1;
  }

  if (!Array.isArray(doc.meds) || !Array.isArray(doc.members) || !isRec(doc.profile)) return null;

  const members = cleanList(doc.members, cleanMember, MAX_ITEMS.members);
  if (members.length === 0) return null;
  const currentUserId =
    typeof doc.currentUserId === 'string' && members.some((m) => m.id === doc.currentUserId) ? doc.currentUserId : members[0].id;

  const seedOptions = cleanSeedOptions(doc.seedOptions);

  return {
    version: CURRENT_VERSION,
    demo: bool(doc.demo, false),
    ...(bool(doc.editado, false) ? { editado: true } : {}),
    anchor: typeof doc.anchor === 'string' && DATE_RE.test(doc.anchor) ? doc.anchor : fallback.anchor,
    seedOptions,
    organizerName: str(doc.organizerName, fallback.organizerName || members[0].name, LIMITS.name),
    currentUserId,
    profile: cleanProfile(doc.profile, fallback.profile),
    members,
    meds: cleanList(doc.meds, cleanMed, MAX_ITEMS.meds),
    doses: cleanList(doc.doses, cleanDose, MAX_ITEMS.doses),
    appts: cleanList(doc.appts, cleanAppt, MAX_ITEMS.appts),
    notes: cleanList(doc.notes, cleanNote, MAX_ITEMS.notes),
    questions: str(doc.questions, '', LIMITS.questions),
    ...(typeof doc.codigoCirculo === 'string' && CODIGO_CIRCULO_RE.test(doc.codigoCirculo) ? { codigoCirculo: doc.codigoCirculo } : {}),
    settings: cleanSettings(doc.settings, fallback.settings),
    lastSeenAt: num(doc.lastSeenAt) ?? 0,
    hitos: Array.isArray(doc.hitos) ? doc.hitos.filter((h): h is string => typeof h === 'string').map((h) => h.slice(0, 40)).slice(0, 50) : [],
    plan: cleanPlan(doc.plan),
  };
}
