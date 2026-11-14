'use client';

// STORE LOCAL de E-Cuidadores — sin librerías, sin red.
// Un solo estado (AppData) guardado en localStorage bajo una clave versionada. React lo lee con
// useSyncExternalStore: el servidor y la primera pasada del cliente reciben los datos de ejemplo
// (getServerSnapshot) y, ya montado, se lee lo guardado. No se guarda ninguna contraseña ni dato
// sensible: solo lo que se ve en pantalla.
//
// PARA EL COMPRADOR DE LA PLANTILLA: este archivo es la única frontera con los datos. Reemplaza
// `load`, `persist` y las acciones por llamadas a tu propio servidor (Supabase, API propia, etc.).

import { useSyncExternalStore } from 'react';
import { keyFromMs } from './dates';
import { buildEmptyData, buildSeed } from './seed';
import type {
  Appt,
  ApptStatus,
  AppData,
  DoseLog,
  Med,
  Note,
  Plan,
  Profile,
  SeedOptions,
  Settings,
  SkipReason,
} from './types';
import { SKIP_REASONS } from './types';
import { doseKey } from './schedule';
import { parseStored } from './persist';
import { track } from './analytics';
import { SELF_ID } from './types';
import { codigoCirculoAleatorio } from './codigo-circulo';

export const STORAGE_KEY = 'entre-hermanos:v1';
const PERSONAL_BACKUP_KEY = 'entre-hermanos:personal-backup:v1';
const UNREADABLE_BACKUP_KEY = 'entre-hermanos:unreadable-backup:v1';

let cache: AppData | null = null;
let serverSeed: AppData | null = null;
const listeners = new Set<() => void>();
let storageBound = false;

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function load(): AppData {
  const now = Date.now();
  const seed = buildSeed(now);
  try {
    if (typeof window === 'undefined') return seed;
    // parseStored valida y limpia lo guardado; si no sirve (dañado, otra versión), devuelve null.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = parseStored(raw, seed);
    // Lo guardado no se pudo leer (otra versión o dañado): se conserva una copia ANTES de que la app lo
    // sobrescriba con el ejemplo, para que nada se pierda en silencio.
    if (!parsed && raw) {
      try {
        if (!window.localStorage.getItem(UNREADABLE_BACKUP_KEY)) window.localStorage.setItem(UNREADABLE_BACKUP_KEY, raw);
      } catch {
        // Sin espacio: no hay nada más que hacer.
      }
    }
    if (parsed) {
      // Datos de ejemplo de otro día: se regeneran para que la demo siempre se vea vigente.
      if (parsed.demo && !parsed.editado && parsed.anchor !== keyFromMs(now)) {
        const fresh = buildSeed(now, parsed.seedOptions);
        fresh.settings = parsed.settings;
        fresh.questions = parsed.questions;
        return fresh;
      }
      return parsed;
    }
  } catch {
    // localStorage bloqueado (modo privado) o con error: se usa el ejemplo y la app sigue funcionando.
  }
  return seed;
}

function persist(d: AppData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    // Sin almacenamiento (modo privado): la app sigue funcionando en memoria.
  }
}

function savePersonalBackup(data: AppData) {
  try {
    window.localStorage.setItem(PERSONAL_BACKUP_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function readPersonalBackup(): AppData | null {
  try {
    const backup = parseStored(window.localStorage.getItem(PERSONAL_BACKUP_KEY), buildSeed(Date.now()));
    return backup && !backup.demo ? backup : null;
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSnapshot(): AppData {
  if (!cache) cache = load();
  return cache;
}

function getServerSnapshot(): AppData {
  if (!serverSeed) serverSeed = buildSeed(Date.now());
  return serverSeed;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!storageBound && typeof window !== 'undefined') {
    storageBound = true;
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        cache = null;
        emit();
      }
    });
  }
  return () => {
    listeners.delete(cb);
  };
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Los datos de ejemplo SIGUEN siendo de ejemplo aunque alguien los edite: solo el recorrido inicial
 * (applyOnboarding) crea un espacio propio. Así nada ficticio (alergias, condiciones, dosis) pasa a
 * hacerse pasar por datos reales de la familia ni llega al resumen para el médico.
 * (`touch` marca el ejemplo como `editado`: deja de regenerarse cada día, pero sigue siendo ejemplo.)
 */
function update(fn: (d: AppData) => AppData, touch = false) {
  let next = fn(getSnapshot());
  if (touch && next.demo && !next.editado) next = { ...next, editado: true };
  cache = next;
  persist(next);
  emit();
}

/* ── "Mientras no estabas": la última visita ANTERIOR a esta sesión (no cambia aunque se marque como vista) ── */
let seenBefore: number | null = null;
export function useSeenBefore(): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (seenBefore === null) seenBefore = getSnapshot().lastSeenAt;
      return seenBefore;
    },
    () => 0
  );
}

/* ── Hora actual: se refresca cada 20 s y solo cambia de valor al minuto ── */
const nowListeners = new Set<() => void>();
let nowTimer: ReturnType<typeof setInterval> | null = null;

function subscribeNow(cb: () => void): () => void {
  nowListeners.add(cb);
  if (!nowTimer) nowTimer = setInterval(() => nowListeners.forEach((l) => l()), 20000);
  return () => {
    nowListeners.delete(cb);
    if (nowListeners.size === 0 && nowTimer) {
      clearInterval(nowTimer);
      nowTimer = null;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribeNow,
    () => Math.floor(Date.now() / 60000) * 60000,
    () => 0
  );
}

/* ── "Listo" de la interfaz: primer paint con skeleton y, tras montar, los datos reales ── */
let ready = false;
let readyTimer: ReturnType<typeof setTimeout> | null = null;
const readyListeners = new Set<() => void>();

function subscribeReady(cb: () => void): () => void {
  readyListeners.add(cb);
  if (!ready && !readyTimer) {
    readyTimer = setTimeout(() => {
      ready = true;
      readyListeners.forEach((l) => l());
    }, 60);
  }
  return () => {
    readyListeners.delete(cb);
  };
}

export function useUiReady(): boolean {
  return useSyncExternalStore(
    subscribeReady,
    () => ready,
    () => false
  );
}

/* ── Acciones tipadas ── */
export const actions = {
  /**
   * REGLA DE LA CONSTITUCIÓN: una dosis nunca se marca como dada sin decir QUIÉN la dio y a qué hora.
   * Devuelve false (y no guarda nada) si falta la persona, si no es del círculo o si los datos no son válidos.
   */
  confirmDose(input: { medId: string; date: string; time: string; byId: string; at?: number }): boolean {
    const snap = getSnapshot();
    const quien = input.byId === SELF_ID || snap.members.some((m) => m.id === input.byId);
    const at = input.at ?? Date.now();
    if (!input.byId || !quien || !Number.isFinite(at)) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return false;
    if (!snap.meds.some((m) => m.id === input.medId)) return false;
    const key = doseKey(input.medId, input.date, input.time);
    const log: DoseLog = { id: `d-${key}`, medId: input.medId, date: input.date, time: input.time, byId: input.byId, at };
    update((d) => ({ ...d, doses: [...d.doses.filter((x) => doseKey(x.medId, x.date, x.time) !== key), log] }));
    track('dosis_confirmada');
    return true;
  },
  /**
   * Anota que una dosis NO se dio, con su motivo. Es un registro honesto: cuenta como "registrada" para la
   * racha y el médico la ve aparte. Mismas validaciones que confirmDose.
   */
  skipDose(input: { medId: string; date: string; time: string; byId: string; reason: SkipReason; at?: number }): boolean {
    const snap = getSnapshot();
    const quien = input.byId === SELF_ID || snap.members.some((m) => m.id === input.byId);
    const at = input.at ?? Date.now();
    if (!input.byId || !quien || !Number.isFinite(at)) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return false;
    if (!snap.meds.some((m) => m.id === input.medId) || !SKIP_REASONS.some((r) => r.id === input.reason)) return false;
    const key = doseKey(input.medId, input.date, input.time);
    const log: DoseLog = { id: `d-${key}`, medId: input.medId, date: input.date, time: input.time, byId: input.byId, at, skipped: input.reason };
    update((d) => ({ ...d, doses: [...d.doses.filter((x) => doseKey(x.medId, x.date, x.time) !== key), log] }));
    track('dosis_omitida', { motivo: input.reason });
    return true;
  },
  undoDose(medId: string, date: string, time: string) {
    const key = doseKey(medId, date, time);
    update((d) => ({ ...d, doses: d.doses.filter((x) => doseKey(x.medId, x.date, x.time) !== key) }));
  },

  saveMed(med: Med) {
    update((d) => {
      const previa = d.meds.find((m) => m.id === med.id);
      // Cambiar horas o frecuencia no reescribe el pasado: el horario nuevo rige desde ahora.
      const cambioHorario = previa && (JSON.stringify(previa.times) !== JSON.stringify(med.times) || JSON.stringify(previa.freq) !== JSON.stringify(med.freq));
      const scheduleFrom = cambioHorario ? Date.now() : previa?.scheduleFrom;
      const guardada: Med = scheduleFrom ? { ...med, scheduleFrom } : med;
      return { ...d, meds: previa ? d.meds.map((m) => (m.id === med.id ? guardada : m)) : [...d.meds, guardada] };
    }, true);
  },
  toggleMedPause(id: string) {
    update((d) => ({ ...d, meds: d.meds.map((m) => (m.id === id ? { ...m, paused: !m.paused, ...(m.paused ? { scheduleFrom: Date.now() } : {}) } : m)) }), true);
  },
  deleteMed(id: string) {
    update((d) => ({ ...d, meds: d.meds.filter((m) => m.id !== id), doses: d.doses.filter((x) => x.medId !== id) }), true);
  },

  saveAppt(appt: Appt) {
    update((d) => {
      const existe = d.appts.some((a) => a.id === appt.id);
      return { ...d, appts: existe ? d.appts.map((a) => (a.id === appt.id ? appt : a)) : [...d.appts, appt] };
    }, true);
  },
  setApptStatus(id: string, status: ApptStatus, result?: string) {
    update(
      (d) => ({
        ...d,
        appts: d.appts.map((a) => (a.id === id ? { ...a, status, result: result ?? a.result } : a)),
      }),
      true
    );
  },

  saveNote(note: Note) {
    update((d) => {
      const existe = d.notes.some((n) => n.id === note.id);
      return { ...d, notes: existe ? d.notes.map((n) => (n.id === note.id ? note : n)) : [...d.notes, note] };
    }, true);
  },
  deleteNote(id: string) {
    update((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }), true);
  },

  updateProfile(patch: Partial<Profile>) {
    update((d) => {
      // La fecha de registro de las alergias cambia solo cuando cambia la lista; si se vacía, no hay fecha.
      let allergiesAt = d.profile.allergiesAt ?? null;
      if (patch.allergies !== undefined && patch.allergies.join('|') !== d.profile.allergies.join('|')) {
        allergiesAt = patch.allergies.length ? keyFromMs(Date.now()) : null;
      }
      return { ...d, profile: { ...d.profile, ...patch, allergiesAt } };
    }, true);
  },
  setQuestions(text: string) {
    update((d) => ({ ...d, questions: text }));
  },
  /** Crea el código de invitación la primera vez (al azar). Después se conserva tal cual. */
  ensureCodigoCirculo() {
    if (getSnapshot().codigoCirculo) return;
    update((d) => ({ ...d, codigoCirculo: codigoCirculoAleatorio() }));
  },
  updateSettings(patch: Partial<Settings>) {
    update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  },

  /** Marca el momento en que se abrió Hoy (para "mientras no estabas"). No cuenta como cambio propio. */
  markSeen(nowMs: number = Date.now()) {
    update((d) => ({ ...d, lastSeenAt: nowMs }));
  },
  /** Guarda que un hito ya se celebró (se celebra una sola vez). */
  markHito(id: string) {
    update((d) => (d.hitos.includes(id) ? d : { ...d, hitos: [...d.hitos, id] }));
  },
  /** Estado de la suscripción. Al conectar Hotmart lo actualiza el webhook; aquí solo sirve para ver los estados. */
  setPlan(patch: Partial<Plan>) {
    update((d) => ({ ...d, plan: { ...d.plan, ...patch } }));
  },

  /** Copia de todo lo guardado, en JSON legible (derecho de acceso y portabilidad). */
  exportarDatos(): string {
    return JSON.stringify({ exportadoEl: new Date().toISOString(), app: 'entre-hermanos', datos: getSnapshot() }, null, 2);
  },

  /** Borra TODO lo guardado en este dispositivo (derecho de supresión) y vuelve al ejemplo sin guardarlo. */
  borrarTodo() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(PERSONAL_BACKUP_KEY);
      window.localStorage.removeItem(UNREADABLE_BACKUP_KEY);
    } catch {
      // Sin acceso al almacenamiento no hay nada guardado que borrar.
    }
    cache = buildSeed(Date.now());
    seenBefore = null;
    emit();
  },

  /** Vuelve a los datos de ejemplo completos (conserva el nombre y los hermanos del recorrido inicial). */
  resetDemo() {
    update((d) => buildSeed(Date.now(), d.seedOptions));
  },

  /** Entra a datos ficticios sin perder el espacio propio que ya estaba guardado. */
  enterDemo() {
    const current = getSnapshot();
    if (!current.demo && !savePersonalBackup(current)) return 'storage-unavailable' as const;
    cache = buildSeed(Date.now(), current.seedOptions);
    seenBefore = null;
    persist(cache);
    emit();
    return 'loaded' as const;
  },

  /** Recupera los datos propios preservados antes de abrir la demostración. */
  restorePersonalData() {
    const backup = readPersonalBackup();
    if (!backup) return 'missing' as const;
    cache = backup;
    seenBefore = null;
    persist(cache);
    try {
      window.localStorage.removeItem(PERSONAL_BACKUP_KEY);
    } catch {
      // La restauración ya quedó aplicada aunque el navegador no permita borrar la copia.
    }
    emit();
    return 'restored' as const;
  },

  /** Al terminar el recorrido inicial: la app arranca con el nombre, los hermanos y la primera medicina del usuario. */
  applyOnboarding(opts: SeedOptions) {
    const current = getSnapshot();
    if (!current.demo) return 'preserved' as const;
    cache = buildEmptyData(Date.now(), opts);
    persist(cache);
    emit();
    return 'applied' as const;
  },
};

export function newId(): string {
  return uid();
}
