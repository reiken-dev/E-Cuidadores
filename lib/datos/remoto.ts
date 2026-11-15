// ACCESO A SUPABASE desde el navegador, con la sesión de quien está dentro (nunca la clave de servicio).
// RLS decide qué ve y qué escribe cada persona: aquí solo se leen y escriben filas. El mapeo vive en ./mapeo.ts.
// Los errores no incluyen datos del paciente: solo un código genérico.
import type { SupabaseClient } from '@supabase/supabase-js';
import { keyFromMs } from '../dates';
import type { AppData, Appt, Med, Note, Profile, SkipReason } from '../types';
import { armarDatos, citaAFila, medAFila, notaAFila, perfilAColumnas, msAIso } from './mapeo';
import type { FilaCirculo, FilaCita, FilaDosis, FilaMed, FilaMiembro, FilaNota, FilaSuscripcion } from './mapeo';

export interface Contexto {
  db: SupabaseClient;
  circleId: string;
  userId: string;
}

/**
 * Por qué no se pudo guardar:
 * - `permiso`: la base lo rechazó con 42501 (p. ej. la suscripción venció y el círculo quedó de solo lectura).
 * - `invalido`: un dato no cumple las reglas de la base (texto demasiado largo, formato incorrecto).
 * - `sin-efecto`: la base respondió sin error pero no cambió ninguna fila (RLS la ocultó o ya no existía).
 * - `otro`: red u otro fallo.
 */
export type CodigoError = 'permiso' | 'invalido' | 'sin-efecto' | 'otro';
export type Resultado = { ok: true } | { ok: false; codigo: CodigoError };

/** Cuántos días de dosis se cargan. Más atrás queda en la base, pero no se trae (la racha y el resumen no lo necesitan). */
export const DIAS_DE_DOSIS = 120;
const PAGINA = 1000; // tope por consulta de PostgREST en Supabase

type ErrorBase = { code?: string } | null;
// 23514 = regla CHECK, 22001 = texto demasiado largo, 22P02 = formato inválido, 23502 = falta un dato obligatorio.
const INVALIDOS = new Set(['23514', '22001', '22P02', '23502']);
export const codigoDeError = (error: NonNullable<ErrorBase>): CodigoError =>
  error.code === '42501' ? 'permiso' : error.code && INVALIDOS.has(error.code) ? 'invalido' : 'otro';
const comoResultado = (error: ErrorBase): Resultado => (error ? { ok: false, codigo: codigoDeError(error) } : { ok: true });

/** Una actualización o un borrado que no cambia ninguna fila (RLS la oculta) NO es un éxito, aunque la base no devuelva error. */
const comoResultadoDeCambio = (r: { data: unknown[] | null; error: ErrorBase }): Resultado =>
  r.error ? comoResultado(r.error) : !r.data || r.data.length === 0 ? { ok: false, codigo: 'sin-efecto' } : { ok: true };

/** Lee todas las filas de una consulta, de a PAGINA, porque la API devuelve como mucho 1000 por llamada. */
async function leerTodo<T>(pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: ErrorBase }>): Promise<T[]> {
  const todas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pagina(desde, desde + PAGINA - 1);
    if (error || !data) throw new Error('lectura');
    todas.push(...data);
    if (data.length < PAGINA) return todas;
  }
}

/** Carga el círculo de la persona con todo lo que cuelga de él. null = aún no tiene círculo. Lanza si algo falla. */
export async function cargarCirculo(db: SupabaseClient, userId: string, opciones: { simpleMode?: boolean; ahora?: number } = {}): Promise<{ circleId: string; datos: AppData } | null> {
  const ahora = opciones.ahora ?? Date.now();
  // RLS solo deja ver los círculos propios. Si hubiera más de uno, se usa el más antiguo.
  const { data: circulos, error } = await db.from('circles').select('*').order('created_at', { ascending: true }).limit(1);
  if (error) throw new Error('circulo');
  const circulo = (circulos as FilaCirculo[] | null)?.[0];
  if (!circulo) return null;
  const id = circulo.id;
  const desde = keyFromMs(ahora - DIAS_DE_DOSIS * 864e5);

  const [miembros, meds, dosis, citas, notas, suscripcion] = await Promise.all([
    leerTodo<FilaMiembro>((a, b) => db.from('members').select('user_id,name,role,last_seen_at').eq('circle_id', id).order('user_id').range(a, b)),
    leerTodo<FilaMed>((a, b) => db.from('meds').select('*').eq('circle_id', id).order('name').order('id').range(a, b)),
    leerTodo<FilaDosis>((a, b) =>
      db
        .from('dose_logs')
        .select('med_id,dose_date,dose_time,given_by,given_by_self,given_at,skipped_reason')
        .eq('circle_id', id)
        .gte('dose_date', desde)
        .order('dose_date')
        .order('dose_time')
        .order('med_id')
        .range(a, b)
    ),
    leerTodo<FilaCita>((a, b) => db.from('appointments').select('*').eq('circle_id', id).order('appt_date').order('id').range(a, b)),
    leerTodo<FilaNota>((a, b) => db.from('notes').select('id,kind,body,author_id,created_at').eq('circle_id', id).order('created_at').order('id').range(a, b)),
    db.from('subscriptions').select('status,plan,updated_at,current_period_end').eq('user_id', userId).maybeSingle(),
  ]);
  if (suscripcion.error) throw new Error('suscripcion');

  return {
    circleId: id,
    datos: armarDatos({
      circulo,
      miembros,
      meds,
      dosis,
      citas,
      notas,
      suscripcion: (suscripcion.data as FilaSuscripcion | null) ?? null,
      userId,
      simpleMode: opciones.simpleMode ?? false,
      ahora,
    }),
  };
}

// ── escritura ───────────────────────────────────────────────────────────────────────────────────────────────────
export const escribir = {
  async guardarMed(c: Contexto, med: Med): Promise<Resultado> {
    const { error } = await c.db.from('meds').upsert(medAFila(med, c.circleId), { onConflict: 'id' });
    return comoResultado(error);
  },
  async borrarMed(c: Contexto, id: string): Promise<Resultado> {
    return comoResultadoDeCambio(await c.db.from('meds').delete().eq('id', id).eq('circle_id', c.circleId).select('id'));
  },
  async guardarCita(c: Contexto, cita: Appt): Promise<Resultado> {
    const { error } = await c.db.from('appointments').upsert(citaAFila(cita, c.circleId), { onConflict: 'id' });
    return comoResultado(error);
  },
  async guardarNota(c: Contexto, nota: Note): Promise<Resultado> {
    const { error } = await c.db.from('notes').upsert(notaAFila(nota, c.circleId), { onConflict: 'id' });
    return comoResultado(error);
  },
  async borrarNota(c: Contexto, id: string): Promise<Resultado> {
    return comoResultadoDeCambio(await c.db.from('notes').delete().eq('id', id).eq('circle_id', c.circleId).select('id'));
  },
  /** Una sola transacción en la base: reemplaza la dosis anterior y la firma con la sesión (nadie firma a nombre de otro). */
  async registrarDosis(c: Contexto, d: { medId: string; date: string; time: string; skipped: SkipReason | null; bySelf: boolean }): Promise<Resultado> {
    const { error } = await c.db.rpc('registrar_dosis', { c: c.circleId, m: d.medId, d: d.date, t: d.time, skipped: d.skipped, by_self: d.bySelf });
    return comoResultado(error);
  },
  async deshacerDosis(c: Contexto, d: { medId: string; date: string; time: string }): Promise<Resultado> {
    return comoResultadoDeCambio(
      await c.db.from('dose_logs').delete().eq('circle_id', c.circleId).eq('med_id', d.medId).eq('dose_date', d.date).eq('dose_time', d.time).select('med_id')
    );
  },
  async actualizarPerfil(c: Contexto, perfil: Profile): Promise<Resultado> {
    return comoResultadoDeCambio(await c.db.from('circles').update(perfilAColumnas(perfil)).eq('id', c.circleId).select('id'));
  },
  async actualizarAjustes(c: Contexto, a: { defaultRemindDayBefore: boolean; defaultRemindHours: number }): Promise<Resultado> {
    return comoResultadoDeCambio(
      await c.db.from('circles').update({ default_remind_day_before: a.defaultRemindDayBefore, default_remind_hours: a.defaultRemindHours }).eq('id', c.circleId).select('id')
    );
  },
  async actualizarPreguntas(c: Contexto, texto: string): Promise<Resultado> {
    return comoResultadoDeCambio(await c.db.from('circles').update({ questions: texto.slice(0, 2000) }).eq('id', c.circleId).select('id'));
  },
  async actualizarHitos(c: Contexto, hitos: string[]): Promise<Resultado> {
    return comoResultadoDeCambio(await c.db.from('circles').update({ celebrated_milestones: hitos }).eq('id', c.circleId).select('id'));
  },
  /** La última visita es propia de cada persona: solo se actualiza su fila de members. */
  async actualizarVisita(c: Contexto, ms: number): Promise<Resultado> {
    return comoResultadoDeCambio(await c.db.from('members').update({ last_seen_at: msAIso(ms) }).eq('circle_id', c.circleId).eq('user_id', c.userId).select('user_id'));
  },
};

// ── crear el círculo (pantalla /bienvenida) ─────────────────────────────────────────────────────────────────────
export interface DatosCirculoNuevo {
  nombreFamiliar: string;
  parentesco: string;
  tuNombre: string;
  primeraMed: { name: string; time: string } | null;
}
/** `sin-suscripcion`: RLS exige una suscripción vigente para crear un círculo. */
export type ResultadoCrear = { ok: true; circleId: string } | { ok: false; codigo: 'sin-suscripcion' | 'otro' };

export async function crearCirculo(db: SupabaseClient, userId: string, d: DatosCirculoNuevo): Promise<ResultadoCrear> {
  const nombre = d.tuNombre.trim().slice(0, 80);
  // El trigger que da de alta al organizador en members lee su nombre de raw_user_meta_data->>'name'.
  if (nombre) {
    const { error } = await db.auth.updateUser({ data: { name: nombre } });
    if (error) return { ok: false, codigo: 'otro' };
  }
  const { data, error } = await db
    .from('circles')
    .insert({ created_by: userId, patient_name: d.nombreFamiliar.trim().slice(0, 80), relation: d.parentesco.trim().slice(0, 40) || 'Familiar mayor' })
    .select('id')
    .single();
  if (error || !data) return { ok: false, codigo: error?.code === '42501' ? 'sin-suscripcion' : 'otro' };
  const circleId = (data as { id: string }).id;
  if (d.primeraMed?.name.trim()) {
    const { error: errMed } = await db.from('meds').insert({
      circle_id: circleId,
      name: d.primeraMed.name.trim().slice(0, 80),
      dose: 'Según receta',
      times: [d.primeraMed.time],
      freq: { kind: 'daily' },
      notes: '',
      paused: false,
    });
    // El círculo ya existe: si falla la medicina, la persona la agrega después desde la app.
    if (errMed) return { ok: true, circleId };
  }
  return { ok: true, circleId };
}
