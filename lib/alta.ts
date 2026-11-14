// Consentimientos del alta, en public.consents.
// Se escriben con la sesión ya creada y el cliente de servidor: RLS ("dar mis consentimientos") solo deja
// insertar filas con el user_id de quien tiene la sesión.
//
// ⚠️ user_metadata.acepta lo escribe el cliente: sirve para ahorrar un paso a quien marcó las casillas en
// /entrar, pero NO es una prueba. La puerta real es tieneConsentimientos(): /app exige las dos filas y, si faltan,
// manda a /aceptar, donde la persona las marca de nuevo y se guardan desde el servidor.
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { filasDeAlta, type FinalidadConsentimiento } from './consentimientos';

export type ResultadoAlta = { ok: true; guardados: boolean } | { ok: false; error: string };

/** Finalidades sin las cuales no se entra a /app. analytics y marketing no cuentan. */
export const FINALIDADES_OBLIGATORIAS: FinalidadConsentimiento[] = ['terms_privacy_adult', 'health_data'];

function aceptadosDe(user: User): { terminos: boolean; salud: boolean } | null {
  const acepta = (user.user_metadata as { acepta?: { terminos?: unknown; salud?: unknown } } | undefined)?.acepta;
  if (!acepta) return null;
  return { terminos: acepta.terminos === true, salud: acepta.salud === true };
}

/** ¿Tiene la persona vigentes los dos consentimientos obligatorios? Falla cerrado: ante cualquier error, false. */
export async function tieneConsentimientos(db: SupabaseClient): Promise<boolean> {
  // RLS limita la lectura a las filas propias.
  const { data, error } = await db
    .from('consents')
    .select('purpose')
    .in('purpose', FINALIDADES_OBLIGATORIAS)
    .is('withdrawn_at', null);
  if (error || !data) return false;
  const vigentes = new Set((data as { purpose: string }[]).map((f) => f.purpose));
  return FINALIDADES_OBLIGATORIAS.every((p) => vigentes.has(p));
}

/** Inserta las dos filas del alta con lo que la persona marcó. Sin las dos casillas no hay alta. No duplica. */
export async function guardarConsentimientos(
  db: SupabaseClient,
  userId: string,
  aceptados: { terminos: boolean; salud: boolean }
): Promise<ResultadoAlta> {
  const filas = filasDeAlta(userId, aceptados);
  if (!filas) return { ok: false, error: 'faltan consentimientos' };
  if (await tieneConsentimientos(db)) return { ok: true, guardados: false };
  const { error } = await db.from('consents').insert(filas);
  return error ? { ok: false, error: 'no se pudieron guardar los consentimientos' } : { ok: true, guardados: true };
}

/**
 * Atajo del alta: si la persona marcó las casillas en /entrar (user_metadata.acepta), las guarda.
 * - Sin casillas en el metadata (solo entra): no hace nada (`guardados: false`); la puerta de /app decide.
 * - Con alguna sin marcar: error.
 */
export async function registrarConsentimientos(db: SupabaseClient, user: User): Promise<ResultadoAlta> {
  const aceptados = aceptadosDe(user);
  if (!aceptados) return { ok: true, guardados: false };
  return guardarConsentimientos(db, user.id, aceptados);
}
