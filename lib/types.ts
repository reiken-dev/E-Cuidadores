// Modelo de datos local de E-Cuidadores. Todo vive en el navegador (localStorage).
// El comprador de la plantilla reemplaza lib/store.ts por su propio servidor.

export type MemberTone = 'accent' | 'indigo' | 'green' | 'amber';

export interface Member {
  id: string;
  name: string;
  role: string;
  tone: MemberTone;
}

/** Id especial: la dosis la confirmó el propio familiar desde el modo simple. */
export const SELF_ID = 'self';

export type Freq =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = domingo … 6 = sábado
  | { kind: 'interval'; every: number; anchor: string }; // cada X días desde anchor ('YYYY-MM-DD')

export interface Med {
  id: string;
  name: string;
  dose: string;
  times: string[]; // 'HH:MM'
  freq: Freq;
  notes: string;
  giverId: string | null;
  paused: boolean;
  startAt: number; // ms: no se exigen dosis anteriores a este momento
  scheduleFrom?: number; // ms: desde cuándo rige el horario ACTUAL (al editar horas/frecuencia o reanudar). Lo anterior queda como historial, sin exigirse de nuevo
}

/** Por qué no se dio una dosis: registrar la verdad también cuenta (y el médico la ve). */
export const SKIP_REASONS = [
  { id: 'rechazo', label: 'No quiso tomarla' },
  { id: 'olvido', label: 'Se nos pasó la hora' },
  { id: 'ausente', label: 'No estaba con nosotros' },
  { id: 'suspendida', label: 'El médico la suspendió' },
  { id: 'otro', label: 'Otro motivo' },
] as const;
export type SkipReason = (typeof SKIP_REASONS)[number]['id'];

export interface DoseLog {
  id: string;
  medId: string;
  date: string; // día de la dosis
  time: string; // hora programada 'HH:MM'
  byId: string; // quién la dio
  at: number; // ms: cuándo la dio (o cuándo se anotó que no se dio)
  skipped?: SkipReason; // presente = la dosis NO se dio; byId es quien lo anotó
}

export type ApptStatus = 'pendiente' | 'atendida' | 'cancelada';
export type RemindHours = 0 | 1 | 2 | 3 | 4;

export interface Appt {
  id: string;
  title: string;
  specialist: string;
  date: string;
  time: string;
  place: string;
  attendeeId: string | null;
  remindDayBefore: boolean;
  remindHoursBefore: RemindHours;
  status: ApptStatus;
  result: string;
}

export type NoteKind = 'sintoma' | 'animo' | 'comida' | 'otra';

export interface Note {
  id: string;
  kind: NoteKind;
  text: string;
  authorId: string;
  at: number;
}

export interface Profile {
  name: string;
  age: number | null;
  relation: string; // 'Mamá' | 'Papá' | 'Familiar mayor'
  allergies: string[];
  /** Día ('YYYY-MM-DD') en que la familia registró o cambió la lista de alergias. Ausente o null = fecha no registrada. */
  allergiesAt?: string | null;
  conditions: string[];
  doctorName: string;
  doctorPhone: string;
  emergencyName: string;
  emergencyPhone: string;
}

export interface Settings {
  defaultRemindDayBefore: boolean;
  defaultRemindHours: RemindHours;
  simpleMode: boolean;
}

export interface SeedOptions {
  name?: string;
  organizerName?: string;
  relation?: string;
  members?: number; // cuántas personas usan la app (contigo incluido)
  firstMed?: { name: string; time: string } | null;
}

/** Estado de la suscripción tal como lo ve la app. Hoy es local; al conectar Hotmart lo actualiza el webhook. */
export type PlanEstado = 'activo' | 'pago_pendiente';
export type PlanTipo = 'mensual' | 'anual';
export interface Plan {
  estado: PlanEstado;
  tipo: PlanTipo;
  desde: number; // ms: inicio de la suscripción
}

export interface AppData {
  version: 1;
  demo: boolean; // true mientras los datos sean de ejemplo (aunque se editen): solo el recorrido inicial crea un espacio propio
  editado?: boolean; // alguien cambió el ejemplo: ya no se regenera cada día, pero SIGUE siendo ejemplo
  anchor: string; // día en que se generó el ejemplo
  seedOptions: SeedOptions;
  organizerName: string;
  currentUserId: string;
  profile: Profile;
  members: Member[];
  meds: Med[];
  doses: DoseLog[];
  appts: Appt[];
  notes: Note[];
  questions: string;
  /** Código al azar para la invitación al círculo. Se crea una vez y se conserva; no sale del nombre de nadie. */
  codigoCirculo?: string;
  settings: Settings;
  /** Última vez que se abrió Hoy (alimenta lo que pasó mientras no estabas). 0 = nunca. */
  lastSeenAt: number;
  /** Hitos ya celebrados (cada uno se celebra una sola vez). */
  hitos: string[];
  plan: Plan;
}

export const NOTE_KINDS: { id: NoteKind; label: string }[] = [
  { id: 'sintoma', label: 'Síntoma' },
  { id: 'animo', label: 'Ánimo' },
  { id: 'comida', label: 'Comida y sueño' },
  { id: 'otra', label: 'Otra' },
];
