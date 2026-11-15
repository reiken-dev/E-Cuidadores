'use client';

// STORE LOCAL de E-Cuidadores — sin librerías, sin red.
// Un solo estado (AppData) guardado en localStorage bajo una clave versionada. React lo lee con
// useSyncExternalStore: el servidor y la primera pasada del cliente reciben los datos de ejemplo
// (getServerSnapshot) y, ya montado, se lee lo guardado. No se guarda ninguna contraseña ni dato
// sensible: solo lo que se ve en pantalla.
//
// PARA EL COMPRADOR DE LA PLANTILLA: este archivo es la única frontera con los datos.
//
// DOS MODOS con la misma fachada (mismos hooks y mismas acciones, mismas firmas):
// - LOCAL (conexiones.supabase = false en lib/marca.ts): demostración. Todo en el navegador, como se describe arriba.
// - REMOTO (conexiones.supabase = true): los datos viven en Supabase (lib/datos/). Al abrir se hidratan desde el
//   servidor y las acciones son OPTIMISTAS: se validan y se aplican en memoria al instante y la escritura va a una cola
//   en segundo plano. Si una escritura falla, se avisa y se vuelve a leer del servidor. En este modo NO se guarda
//   ningún dato de salud en localStorage (solo la preferencia del modo simple).

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
import { MARCA } from './marca';
import { crearClienteNavegador } from './supabase/navegador';
import { cargarCirculo, escribir } from './datos/remoto';
import type { CodigoError, Contexto, Resultado } from './datos/remoto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const STORAGE_KEY = 'entre-hermanos:v1';
const PERSONAL_BACKUP_KEY = 'entre-hermanos:personal-backup:v1';
const UNREADABLE_BACKUP_KEY = 'entre-hermanos:unreadable-backup:v1';

/** Con Supabase conectado los datos viven en el servidor; sin él, en el navegador (demostración). */
export const MODO_REMOTO = MARCA.conexiones.supabase;
const SIMPLE_KEY = 'entre-hermanos:simple'; // única preferencia local en modo remoto (no es un dato de salud)

export type EstadoDatos = 'cargando' | 'listo' | 'error';

let cache: AppData | null = null;
let serverSeed: AppData | null = null;
const listeners = new Set<() => void>();
let storageBound = false;

// Estado del modo remoto
let estadoDatos: EstadoDatos = 'cargando';
let aviso: string | null = null;
let contexto: Contexto | null = null;
let hidratando = false;
let primeraCarga = true;
let cola: Promise<void> = Promise.resolve();
let pendientes = 0; // escrituras en cola o en vuelo
let necesitaRecarga = false;
let ultimoCodigo: CodigoError = 'otro';
let vigilando = false;
let avisoAntesDeSalir = false;

/** Mientras no llegan los datos reales (y en el servidor) se muestra un espacio vacío: nunca datos de ejemplo. */
function marcador(): AppData {
  return buildEmptyData(Date.now(), {});
}

/** Id nuevo. Siempre un uuid v4 válido, porque la base lo exige: randomUUID solo existe en contextos seguros (https o localhost). */
function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  const hex = (n: number) => Math.floor(Math.random() * n).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => (c === 'x' ? hex(16) : (8 + Math.floor(Math.random() * 4)).toString(16)));
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
  if (!cache) cache = MODO_REMOTO ? marcador() : load();
  return cache;
}

function getServerSnapshot(): AppData {
  if (!serverSeed) serverSeed = MODO_REMOTO ? marcador() : buildSeed(Date.now());
  return serverSeed;
}

function leerSimple(): boolean {
  try {
    return window.localStorage.getItem(SIMPLE_KEY) === '1';
  } catch {
    return false;
  }
}

const urlEntrar = () => `${window.location.origin}/entrar`;
/** Navegación COMPLETA al acceso: así ningún dato de la familia anterior queda en la memoria de la página. */
function irAEntrar() {
  try {
    window.location.assign(urlEntrar());
  } catch {
    // Sin location (pruebas o un entorno raro): no hay a dónde navegar.
  }
}

/** Si la sesión se cierra, caduca o cambia de persona (otra pestaña), se vuelve al acceso. */
function vigilarSesion(db: SupabaseClient, userId: string) {
  if (vigilando) return;
  vigilando = true;
  db.auth.onAuthStateChange((evento, sesion) => {
    if (evento === 'SIGNED_OUT' || (sesion?.user && sesion.user.id !== userId)) irAEntrar();
  });
}

/**
 * Lee el círculo del servidor. `silenciosa`: no vuelve al estado «cargando» (recarga tras un fallo al guardar).
 * Devuelve 'descartada' si, mientras se leía, llegaron escrituras nuevas: aplicar esa lectura pisaría cambios aún sin enviar.
 */
async function hidratar(silenciosa = false): Promise<'ok' | 'error' | 'descartada'> {
  if (!MODO_REMOTO || typeof window === 'undefined') return 'error';
  if (!silenciosa) {
    estadoDatos = 'cargando';
    emit();
  }
  let resultado: 'ok' | 'error' | 'descartada' = 'error';
  try {
    const db = crearClienteNavegador();
    if (!db) throw new Error('sin-cliente');
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) {
      irAEntrar(); // sesión caducada o cerrada: no tiene sentido «reintentar»
      throw new Error('sin-sesion');
    }
    vigilarSesion(db, data.user.id);
    const r = await cargarCirculo(db, data.user.id, { simpleMode: leerSimple() });
    if (!r) throw new Error('sin-circulo');
    contexto = { db, circleId: r.circleId, userId: data.user.id };
    if (silenciosa && pendientes > 0) {
      resultado = 'descartada';
    } else {
      // Un sondeo que no trae nada nuevo conserva el mismo objeto: así la pantalla no se vuelve a pintar.
      if (!(silenciosa && cache && JSON.stringify(cache) === JSON.stringify(r.datos))) cache = r.datos;
      // «Mientras no estabas» usa la última visita ANTERIOR a esta sesión: se fija con el primer dato real.
      if (primeraCarga) {
        seenBefore = null;
        primeraCarga = false;
      }
      estadoDatos = 'listo';
      resultado = 'ok';
    }
  } catch {
    // Sin log: el error podría traer datos de la familia. Si ya había datos en pantalla, se conservan.
    if (!silenciosa) estadoDatos = 'error';
  }
  emit();
  return resultado;
}

/* ── Sondeo: ver lo que anotan los hermanos (ECU-10). Sin websockets: al volver a la app y cada 30 s con la pestaña visible ── */
export const INTERVALO_SONDEO_MS = 30000;
let sondeoTimer: ReturnType<typeof setInterval> | null = null;
let sondeando = false;

/** Lee el círculo si es seguro: pestaña visible, datos ya cargados y nada sin enviar (una lectura pisaría lo que aún no salió). */
async function sondear() {
  if (!MODO_REMOTO || sondeando) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (estadoDatos !== 'listo' || pendientes > 0) return;
  sondeando = true;
  try {
    await hidratar(true);
  } finally {
    sondeando = false;
  }
}

const alVolver = () => {
  if (document.visibilityState === 'visible') void sondear();
};
const alReconectar = () => void sondear();

function iniciarSondeo() {
  if (sondeoTimer || typeof window === 'undefined') return;
  sondeoTimer = setInterval(() => void sondear(), INTERVALO_SONDEO_MS);
  document.addEventListener('visibilitychange', alVolver);
  window.addEventListener('online', alReconectar);
}

function detenerSondeo() {
  if (sondeoTimer) clearInterval(sondeoTimer);
  sondeoTimer = null;
  if (typeof window === 'undefined') return;
  document.removeEventListener('visibilitychange', alVolver);
  window.removeEventListener('online', alReconectar);
}

function iniciarHidratacion() {
  if (hidratando || typeof window === 'undefined') return;
  hidratando = true;
  void hidratar();
}

const MENSAJES: Record<CodigoError, string> = {
  permiso: 'No se pudo guardar el último cambio. Puede que la suscripción haya vencido y el círculo esté en solo lectura.',
  invalido: 'No se pudo guardar el último cambio: algún dato no es válido, por ejemplo un texto demasiado largo.',
  'sin-efecto': 'No se pudo completar el último cambio: puede que ya no exista o que el círculo esté en solo lectura.',
  otro: 'No se pudo guardar el último cambio. Revisa tu conexión.',
};

/**
 * Cola serial de escrituras en segundo plano (modo remoto). Si una falla, cuando la cola se vacía se vuelve a leer del
 * servidor (nunca antes: leer a mitad pisaría cambios que aún no salieron) y se avisa con lo que de verdad pasó.
 * `silencioso`: un fallo no avisa ni recarga (para anotaciones menores, como un hito ya celebrado).
 */
function enviar(op: (c: Contexto) => Promise<Resultado>, opciones: { silencioso?: boolean } = {}) {
  if (!MODO_REMOTO) return;
  pendientes++;
  cola = cola.then(async () => {
    let codigo: CodigoError | null = null;
    try {
      if (!contexto) codigo = 'otro';
      else {
        const r = await op(contexto);
        if (!r.ok) codigo = r.codigo;
      }
    } catch {
      codigo = 'otro';
    }
    pendientes--;
    if (codigo && !opciones.silencioso) {
      ultimoCodigo = codigo;
      necesitaRecarga = true;
    }
    if (pendientes === 0 && necesitaRecarga) {
      necesitaRecarga = false;
      const recarga = await hidratar(true);
      if (recarga === 'descartada' || pendientes > 0) {
        necesitaRecarga = true; // llegaron cambios nuevos mientras se leía: se recarga al terminarlos
        return;
      }
      aviso = `${MENSAJES[ultimoCodigo]} ${recarga === 'ok' ? 'Se recargaron tus datos.' : 'No pudimos recargar tus datos: lo que ves puede no estar guardado.'}`;
      emit();
    }
  });
}

/** Espera a que salgan las escrituras pendientes (con tope de tiempo). true = no queda nada sin enviar. */
async function vaciarCola(tiempoMs = 5000): Promise<boolean> {
  if (!MODO_REMOTO) return true;
  let vencio = false;
  await Promise.race([
    cola,
    new Promise<void>((r) =>
      setTimeout(() => {
        vencio = true;
        r();
      }, tiempoMs)
    ),
  ]);
  return !vencio && pendientes === 0;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (MODO_REMOTO) {
    iniciarHidratacion();
    iniciarSondeo();
    if (!avisoAntesDeSalir && typeof window !== 'undefined') {
      avisoAntesDeSalir = true;
      // Cerrar o recargar la pestaña con cambios sin enviar los perdería: el navegador pregunta antes.
      window.addEventListener('beforeunload', (e) => {
        if (pendientes > 0) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
    }
  }
  if (!MODO_REMOTO && !storageBound && typeof window !== 'undefined') {
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
    if (MODO_REMOTO && listeners.size === 0) detenerSondeo();
  };
}

/** Suscripción al store (la usan los hooks; se exporta para probar el sondeo). */
export const suscribirAlStore = subscribe;

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
  if (!MODO_REMOTO) persist(next);
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

// En modo remoto «listo» significa que los datos reales ya llegaron; en modo local, el temporizador de 60 ms.
const subscribeListo = MODO_REMOTO ? subscribe : subscribeReady;
const leerListo = MODO_REMOTO ? () => estadoDatos === 'listo' : () => ready;

export function useUiReady(): boolean {
  return useSyncExternalStore(subscribeListo, leerListo, () => false);
}

/** Estado de la carga inicial de los datos. En modo local siempre es 'listo'. */
export const leerEstadoDatos = (): EstadoDatos => (MODO_REMOTO ? estadoDatos : 'listo');
export function useEstadoDatos(): EstadoDatos {
  return useSyncExternalStore(subscribe, leerEstadoDatos, () => (MODO_REMOTO ? 'cargando' : 'listo'));
}

/** Aviso de que un cambio no se pudo guardar (modo remoto), o null. */
export const leerAvisoDatos = (): string | null => aviso;
export function useAvisoDatos(): string | null {
  return useSyncExternalStore(subscribe, leerAvisoDatos, () => null);
}

/* ── Acciones tipadas ── */
export const actions = {
  /**
   * REGLA DE LA CONSTITUCIÓN: una dosis nunca se marca como dada sin decir QUIÉN la dio y a qué hora.
   * Devuelve false (y no guarda nada) si falta la persona, si no es del círculo o si los datos no son válidos.
   */
  confirmDose(input: { medId: string; date: string; time: string; byId: string; at?: number }): boolean {
    const snap = getSnapshot();
    // Con Supabase la dosis la firma siempre quien tiene la sesión (el servidor lo impone): nadie firma a nombre de otro.
    const byId = MODO_REMOTO && input.byId !== SELF_ID ? snap.currentUserId : input.byId;
    const quien = byId === SELF_ID || snap.members.some((m) => m.id === byId);
    const at = input.at ?? Date.now();
    if (!byId || !quien || !Number.isFinite(at)) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return false;
    if (!snap.meds.some((m) => m.id === input.medId)) return false;
    const key = doseKey(input.medId, input.date, input.time);
    const log: DoseLog = { id: `d-${key}`, medId: input.medId, date: input.date, time: input.time, byId, at };
    update((d) => ({ ...d, doses: [...d.doses.filter((x) => doseKey(x.medId, x.date, x.time) !== key), log] }));
    enviar((c) => escribir.registrarDosis(c, { medId: input.medId, date: input.date, time: input.time, skipped: null, bySelf: byId === SELF_ID }));
    track('dosis_confirmada');
    return true;
  },
  /**
   * Anota que una dosis NO se dio, con su motivo. Es un registro honesto: cuenta como "registrada" para la
   * racha y el médico la ve aparte. Mismas validaciones que confirmDose.
   */
  skipDose(input: { medId: string; date: string; time: string; byId: string; reason: SkipReason; at?: number }): boolean {
    const snap = getSnapshot();
    const byId = MODO_REMOTO && input.byId !== SELF_ID ? snap.currentUserId : input.byId;
    const quien = byId === SELF_ID || snap.members.some((m) => m.id === byId);
    const at = input.at ?? Date.now();
    if (!byId || !quien || !Number.isFinite(at)) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return false;
    if (!snap.meds.some((m) => m.id === input.medId) || !SKIP_REASONS.some((r) => r.id === input.reason)) return false;
    const key = doseKey(input.medId, input.date, input.time);
    const log: DoseLog = { id: `d-${key}`, medId: input.medId, date: input.date, time: input.time, byId, at, skipped: input.reason };
    update((d) => ({ ...d, doses: [...d.doses.filter((x) => doseKey(x.medId, x.date, x.time) !== key), log] }));
    enviar((c) => escribir.registrarDosis(c, { medId: input.medId, date: input.date, time: input.time, skipped: input.reason, bySelf: byId === SELF_ID }));
    track('dosis_omitida', { motivo: input.reason });
    return true;
  },
  undoDose(medId: string, date: string, time: string) {
    const key = doseKey(medId, date, time);
    update((d) => ({ ...d, doses: d.doses.filter((x) => doseKey(x.medId, x.date, x.time) !== key) }));
    enviar((c) => escribir.deshacerDosis(c, { medId, date, time }));
  },

  saveMed(med: Med) {
    let aGuardar: Med = med;
    update((d) => {
      const previa = d.meds.find((m) => m.id === med.id);
      // Cambiar horas o frecuencia no reescribe el pasado: el horario nuevo rige desde ahora.
      const cambioHorario = previa && (JSON.stringify(previa.times) !== JSON.stringify(med.times) || JSON.stringify(previa.freq) !== JSON.stringify(med.freq));
      const scheduleFrom = cambioHorario ? Date.now() : previa?.scheduleFrom;
      const guardada: Med = scheduleFrom ? { ...med, scheduleFrom } : med;
      aGuardar = guardada;
      return { ...d, meds: previa ? d.meds.map((m) => (m.id === med.id ? guardada : m)) : [...d.meds, guardada] };
    }, true);
    enviar((c) => escribir.guardarMed(c, aGuardar));
  },
  toggleMedPause(id: string) {
    update((d) => ({ ...d, meds: d.meds.map((m) => (m.id === id ? { ...m, paused: !m.paused, ...(m.paused ? { scheduleFrom: Date.now() } : {}) } : m)) }), true);
    const cambiada = getSnapshot().meds.find((m) => m.id === id);
    if (cambiada) enviar((c) => escribir.guardarMed(c, cambiada));
  },
  deleteMed(id: string) {
    update((d) => ({ ...d, meds: d.meds.filter((m) => m.id !== id), doses: d.doses.filter((x) => x.medId !== id) }), true);
    enviar((c) => escribir.borrarMed(c, id));
  },

  saveAppt(appt: Appt) {
    update((d) => {
      const existe = d.appts.some((a) => a.id === appt.id);
      return { ...d, appts: existe ? d.appts.map((a) => (a.id === appt.id ? appt : a)) : [...d.appts, appt] };
    }, true);
    enviar((c) => escribir.guardarCita(c, appt));
  },
  setApptStatus(id: string, status: ApptStatus, result?: string) {
    update(
      (d) => ({
        ...d,
        appts: d.appts.map((a) => (a.id === id ? { ...a, status, result: result ?? a.result } : a)),
      }),
      true
    );
    const cambiada = getSnapshot().appts.find((a) => a.id === id);
    if (cambiada) enviar((c) => escribir.guardarCita(c, cambiada));
  },

  saveNote(note: Note) {
    update((d) => {
      const existe = d.notes.some((n) => n.id === note.id);
      return { ...d, notes: existe ? d.notes.map((n) => (n.id === note.id ? note : n)) : [...d.notes, note] };
    }, true);
    enviar((c) => escribir.guardarNota(c, note));
  },
  deleteNote(id: string) {
    update((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }), true);
    enviar((c) => escribir.borrarNota(c, id));
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
    const perfil = getSnapshot().profile;
    enviar((c) => escribir.actualizarPerfil(c, perfil));
  },
  setQuestions(text: string) {
    update((d) => ({ ...d, questions: text }));
    enviar((c) => escribir.actualizarPreguntas(c, text));
  },
  /** Crea el código de invitación la primera vez (al azar). Después se conserva tal cual. En modo remoto lo gestiona la invitación (ECU-9). */
  ensureCodigoCirculo() {
    if (MODO_REMOTO || getSnapshot().codigoCirculo) return;
    update((d) => ({ ...d, codigoCirculo: codigoCirculoAleatorio() }));
  },
  updateSettings(patch: Partial<Settings>) {
    update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    if (!MODO_REMOTO) return;
    // El modo simple es una preferencia de este dispositivo; los recordatorios por defecto son del círculo.
    if (patch.simpleMode !== undefined) {
      try {
        window.localStorage.setItem(SIMPLE_KEY, patch.simpleMode ? '1' : '0');
      } catch {
        // Sin almacenamiento: la preferencia dura lo que dure la sesión.
      }
    }
    if (patch.defaultRemindDayBefore !== undefined || patch.defaultRemindHours !== undefined) {
      const { defaultRemindDayBefore, defaultRemindHours } = getSnapshot().settings;
      enviar((c) => escribir.actualizarAjustes(c, { defaultRemindDayBefore, defaultRemindHours }));
    }
  },

  /** Marca el momento en que se abrió Hoy (para "mientras no estabas"). No cuenta como cambio propio. */
  markSeen(nowMs: number = Date.now()) {
    update((d) => ({ ...d, lastSeenAt: nowMs }));
    enviar((c) => escribir.actualizarVisita(c, nowMs));
  },
  /** Guarda que un hito ya se celebró (se celebra una sola vez). */
  markHito(id: string) {
    if (getSnapshot().hitos.includes(id)) return;
    update((d) => ({ ...d, hitos: [...d.hitos, id] }));
    // Si falla (p. ej. el círculo está de solo lectura) no se avisa ni se recarga: solo se vuelve a intentar en otra visita.
    enviar((c) => escribir.actualizarHitos(c, getSnapshot().hitos), { silencioso: true });
  },
  /** Estado de la suscripción. Al conectar Hotmart lo actualiza el webhook; aquí solo sirve para ver los estados. */
  setPlan(patch: Partial<Plan>) {
    if (MODO_REMOTO) return; // con Supabase el estado lo escribe solo el servidor (webhook de Hotmart)
    update((d) => ({ ...d, plan: { ...d.plan, ...patch } }));
  },

  /** Copia de todo lo guardado, en JSON legible (derecho de acceso y portabilidad). */
  exportarDatos(): string {
    return JSON.stringify({ exportadoEl: new Date().toISOString(), app: 'entre-hermanos', datos: getSnapshot() }, null, 2);
  },

  /** Borra TODO lo guardado en este dispositivo (derecho de supresión) y vuelve al ejemplo sin guardarlo. */
  borrarTodo() {
    if (MODO_REMOTO) return; // borrar el círculo o la cuenta es otra función (derecho de supresión), no esta
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
    if (MODO_REMOTO) return;
    update((d) => buildSeed(Date.now(), d.seedOptions));
  },

  /** Entra a datos ficticios sin perder el espacio propio que ya estaba guardado. */
  enterDemo() {
    if (MODO_REMOTO) return 'storage-unavailable' as const;
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
    if (MODO_REMOTO) return 'missing' as const;
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

  /** Vuelve a leer los datos del servidor tras un error de carga (modo remoto). */
  reintentarCarga() {
    void hidratar();
  },
  /** Espera a que salgan las escrituras pendientes, con tope de tiempo. Úsalo antes de cerrar sesión. */
  vaciarCola(): Promise<boolean> {
    return vaciarCola();
  },
  /** Cierra el aviso de «no se pudo guardar». */
  descartarAviso() {
    aviso = null;
    emit();
  },

  /** Al terminar el recorrido inicial: la app arranca con el nombre, los hermanos y la primera medicina del usuario. */
  applyOnboarding(opts: SeedOptions) {
    if (MODO_REMOTO) return 'preserved' as const; // con Supabase el círculo se crea en /bienvenida
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
