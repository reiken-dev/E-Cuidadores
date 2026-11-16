// MAPEO fila de Supabase ⇄ tipos de la app (lib/types.ts). Lógica PURA: sin red ni base de datos, con pruebas.
// Las tablas están en supabase/schema.sql (+ retencion.sql y datos-reales.sql). Aquí se traducen los nombres
// (snake_case → camelCase), las fechas (timestamptz ⇄ milisegundos) y los ids (uuid de auth.users).
import { keyFromMs } from '../dates';
import type { Appt, AppData, ApptStatus, DoseLog, Freq, Med, Member, MemberTone, Note, NoteKind, Plan, Profile, RemindHours, Settings, SkipReason } from '../types';
import { SELF_ID } from '../types';

export interface FilaCirculo {
  id: string;
  patient_name: string;
  patient_age: number | null;
  relation: string;
  allergies: string[] | null;
  conditions: string[] | null;
  doctor_name: string;
  doctor_phone: string;
  emergency_name: string;
  emergency_phone: string;
  default_remind_day_before: boolean;
  default_remind_hours: number;
  celebrated_milestones: string[] | null;
  questions: string | null;
  allergies_at: string | null;
}
export interface FilaMiembro {
  user_id: string;
  name: string;
  role: string | null;
  last_seen_at: string | null;
}
export interface FilaMed {
  id: string;
  name: string;
  dose: string;
  times: string[];
  freq: unknown;
  notes: string;
  giver_id: string | null;
  paused: boolean;
  start_at: string;
  schedule_from: string | null;
}
export interface FilaDosis {
  med_id: string;
  dose_date: string;
  dose_time: string;
  given_by: string | null;
  given_by_self: boolean;
  given_at: string;
  skipped_reason: string | null;
}
export interface FilaCita {
  id: string;
  title: string;
  specialist: string;
  appt_date: string;
  appt_time: string;
  place: string;
  attendee_id: string | null;
  remind_day_before: boolean;
  remind_hours_before: number;
  status: string;
  result: string;
}
export interface FilaNota {
  id: string;
  kind: string;
  body: string;
  author_id: string | null;
  created_at: string;
}
export interface FilaSuscripcion {
  status: string;
  plan: string;
  updated_at: string;
  current_period_end?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export const msAIso = (ms: number): string => new Date(ms).toISOString();
export function isoAMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

const TONOS: MemberTone[] = ['accent', 'indigo', 'green', 'amber'];
/** El color de cada persona no se guarda: sale siempre igual del id (así no cambia entre sesiones ni entre hermanos). */
export function tonoDe(id: string): MemberTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONOS[h % TONOS.length];
}

const HORAS: RemindHours[] = [0, 1, 2, 3, 4];
const horasDe = (n: number): RemindHours => (HORAS.includes(n as RemindHours) ? (n as RemindHours) : 3);
const ESTADOS_CITA: ApptStatus[] = ['pendiente', 'atendida', 'cancelada'];
const TIPOS_NOTA: NoteKind[] = ['sintoma', 'animo', 'comida', 'otra'];
const MOTIVOS: SkipReason[] = ['rechazo', 'olvido', 'ausente', 'suspendida', 'otro'];

// ── lectura: fila → tipo ────────────────────────────────────────────────────────────────────────────────────────
export function perfilDeFila(c: FilaCirculo): Profile {
  return {
    name: c.patient_name,
    age: c.patient_age,
    relation: c.relation,
    allergies: c.allergies ?? [],
    allergiesAt: c.allergies_at,
    conditions: c.conditions ?? [],
    doctorName: c.doctor_name,
    doctorPhone: c.doctor_phone,
    emergencyName: c.emergency_name,
    emergencyPhone: c.emergency_phone,
  };
}

export function ajustesDeFila(c: FilaCirculo, simpleMode = false): Settings {
  return { defaultRemindDayBefore: c.default_remind_day_before, defaultRemindHours: horasDe(c.default_remind_hours), simpleMode };
}

export function miembroDeFila(m: FilaMiembro): Member {
  return { id: m.user_id, name: m.name, role: m.role ?? '', tone: tonoDe(m.user_id) };
}

export function medDeFila(r: FilaMed): Med {
  const med: Med = {
    id: r.id,
    name: r.name,
    dose: r.dose,
    times: r.times,
    freq: r.freq as Freq,
    notes: r.notes,
    giverId: r.giver_id,
    paused: r.paused,
    startAt: isoAMs(r.start_at) ?? 0,
  };
  const desde = isoAMs(r.schedule_from);
  if (desde !== null) med.scheduleFrom = desde;
  return med;
}

/** La clave de una dosis es (medicina, día, hora): la misma que usa lib/schedule.ts (doseKey). */
export function dosisDeFila(r: FilaDosis): DoseLog {
  const log: DoseLog = {
    id: `d-${r.med_id}|${r.dose_date}|${r.dose_time}`,
    medId: r.med_id,
    date: r.dose_date,
    time: r.dose_time,
    // given_by queda null si esa persona borró su cuenta: el historial se conserva y la pantalla dice «Alguien de la familia».
    byId: r.given_by_self ? SELF_ID : (r.given_by ?? 'ex-miembro'),
    at: isoAMs(r.given_at) ?? 0,
  };
  if (r.skipped_reason && MOTIVOS.includes(r.skipped_reason as SkipReason)) log.skipped = r.skipped_reason as SkipReason;
  return log;
}

export function citaDeFila(r: FilaCita): Appt {
  return {
    id: r.id,
    title: r.title,
    specialist: r.specialist,
    date: r.appt_date,
    time: r.appt_time,
    place: r.place,
    attendeeId: r.attendee_id,
    remindDayBefore: r.remind_day_before,
    remindHoursBefore: horasDe(r.remind_hours_before),
    status: ESTADOS_CITA.includes(r.status as ApptStatus) ? (r.status as ApptStatus) : 'pendiente',
    result: r.result,
  };
}

export function notaDeFila(r: FilaNota): Note {
  return {
    id: r.id,
    kind: TIPOS_NOTA.includes(r.kind as NoteKind) ? (r.kind as NoteKind) : 'otra',
    text: r.body,
    authorId: r.author_id ?? 'ex-miembro',
    at: isoAMs(r.created_at) ?? 0,
  };
}

/** Días de gracia después del fin del periodo para una suscripción activa o con cobro fallido (supabase/vigencia-y-correo.sql). */
export const GRACIA_DIAS = 7;
/** Si Hotmart no manda la fecha de fin: última actualización + este periodo según el plan. Igual que la base. */
export const PERIODO_DE_RESPALDO_DIAS = { mensual: 31, anual: 366, desconocido: 31 } as const;
const DIA_MS = 864e5;

/** Hasta cuándo (ms) conserva el acceso una suscripción activa o con cobro fallido, gracia incluida. */
function accesoHasta(s: FilaSuscripcion): number {
  const fin = isoAMs(s.current_period_end ?? null);
  const dias = s.plan === 'anual' ? PERIODO_DE_RESPALDO_DIAS.anual : PERIODO_DE_RESPALDO_DIAS.mensual;
  return (fin ?? (isoAMs(s.updated_at) ?? 0) + dias * DIA_MS) + GRACIA_DIAS * DIA_MS;
}

/**
 * Lo único que la pantalla del plan necesita saber. La suscripción la escribe solo el servidor (webhook de Hotmart).
 * RLS solo deja leer la fila PROPIA: quien no tiene una (un hermano invitado, que no paga) no ve un aviso de cobro que
 * no es suyo. El estado real del círculo lo impone la base al escribir (circle_active).
 */
export function planDeSuscripcion(s: FilaSuscripcion | null, ahora: number = Date.now()): Plan {
  if (!s) return { estado: 'activo', tipo: 'mensual', desde: 0 };
  const base = { tipo: s.plan === 'anual' ? ('anual' as const) : ('mensual' as const), desde: isoAMs(s.updated_at) ?? 0 };
  // trial: sin cambio (vigente sin fecha); hoy ningún aviso del webhook lo asigna.
  if (s.status === 'trial') return { ...base, estado: 'activo' };
  // Activa o con cobro fallido: vigente hasta la fecha de fin (o la de respaldo por plan) + gracia. Igual que la base.
  if (s.status === 'active' || s.status === 'past_due') {
    if (accesoHasta(s) > ahora) return s.status === 'active' ? { ...base, estado: 'activo' } : { ...base, estado: 'pago_pendiente', motivo: 'cobro' };
    return { ...base, estado: 'pago_pendiente', motivo: 'inactiva' };
  }
  // Mismo criterio que la base (suscripcion_vigente): una cancelada conserva el acceso solo hasta el fin de lo ya pagado.
  if (s.status === 'canceled') {
    const fin = isoAMs(s.current_period_end ?? null);
    return fin !== null && fin > ahora ? { ...base, estado: 'activo' } : { ...base, estado: 'pago_pendiente', motivo: 'inactiva' };
  }
  // Vencida, reembolsada o con contracargo: ya no hay acceso.
  return { ...base, estado: 'pago_pendiente', motivo: 'inactiva' };
}

// ── escritura: tipo → fila ──────────────────────────────────────────────────────────────────────────────────────
export function medAFila(med: Med, circleId: string) {
  return {
    id: med.id,
    circle_id: circleId,
    name: med.name,
    dose: med.dose,
    times: med.times,
    freq: med.freq,
    notes: med.notes,
    // Un id que no es de una persona real (p. ej. de la demostración) no puede ir a una clave foránea.
    giver_id: esUuid(med.giverId) ? med.giverId : null,
    paused: med.paused,
    start_at: msAIso(med.startAt),
    schedule_from: med.scheduleFrom ? msAIso(med.scheduleFrom) : null,
  };
}

export function citaAFila(a: Appt, circleId: string) {
  return {
    id: a.id,
    circle_id: circleId,
    title: a.title,
    specialist: a.specialist,
    appt_date: a.date,
    appt_time: a.time,
    place: a.place,
    attendee_id: esUuid(a.attendeeId) ? a.attendeeId : null,
    remind_day_before: a.remindDayBefore,
    remind_hours_before: a.remindHoursBefore,
    status: a.status,
    result: a.result,
  };
}

/** author_id y author_name los fija el servidor con la sesión (trigger notes_atribuir): aquí no se envían. */
export function notaAFila(n: Note, circleId: string) {
  return { id: n.id, circle_id: circleId, kind: n.kind, body: n.text, created_at: msAIso(n.at) };
}

export function perfilAColumnas(p: Profile) {
  return {
    patient_name: p.name,
    patient_age: p.age,
    relation: p.relation,
    allergies: p.allergies,
    conditions: p.conditions,
    doctor_name: p.doctorName,
    doctor_phone: p.doctorPhone,
    emergency_name: p.emergencyName,
    emergency_phone: p.emergencyPhone,
    allergies_at: p.allergiesAt ?? null,
  };
}

// ── armar todo el estado ────────────────────────────────────────────────────────────────────────────────────────
export interface FilasDelCirculo {
  circulo: FilaCirculo;
  miembros: FilaMiembro[];
  meds: FilaMed[];
  dosis: FilaDosis[];
  citas: FilaCita[];
  notas: FilaNota[];
  suscripcion: FilaSuscripcion | null;
  userId: string;
  simpleMode: boolean;
  ahora: number;
}

export function armarDatos(f: FilasDelCirculo): AppData {
  const members = f.miembros.map(miembroDeFila);
  const yo = f.miembros.find((m) => m.user_id === f.userId);
  return {
    version: 1,
    demo: false,
    anchor: keyFromMs(f.ahora),
    seedOptions: {},
    organizerName: yo?.name ?? '',
    currentUserId: f.userId,
    profile: perfilDeFila(f.circulo),
    members,
    meds: f.meds.map(medDeFila),
    doses: f.dosis.map(dosisDeFila),
    appts: f.citas.map(citaDeFila),
    notes: f.notas.map(notaDeFila),
    questions: f.circulo.questions ?? '',
    settings: ajustesDeFila(f.circulo, f.simpleMode),
    lastSeenAt: isoAMs(yo?.last_seen_at) ?? 0,
    hitos: f.circulo.celebrated_milestones ?? [],
    plan: planDeSuscripcion(f.suscripcion, f.ahora),
  };
}
