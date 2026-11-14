// Alta de cuenta: guarda los consentimientos de la persona recién registrada en public.consents.
// Se llama con la sesión ya creada, usando el cliente de servidor: RLS ("dar mis consentimientos") solo deja
// insertar filas con el user_id de quien tiene la sesión.
// Las casillas llegan en user_metadata.acepta, escritas por EntrarForm al crear la cuenta.
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { filasDeAlta } from './consentimientos';

export type ResultadoAlta = { ok: true; guardados: boolean } | { ok: false; error: string };

function aceptadosDe(user: User): { terminos: boolean; salud: boolean } | null {
  const acepta = (user.user_metadata as { acepta?: { terminos?: unknown; salud?: unknown } } | undefined)?.acepta;
  if (!acepta) return null;
  return { terminos: acepta.terminos === true, salud: acepta.salud === true };
}

/**
 * Inserta los consentimientos del alta si la persona los marcó y aún no están guardados.
 * - Cuenta que ya existía y no marcó nada (solo entra): no hace nada (`guardados: false`).
 * - Marcó las casillas: si ya hay filas suyas, no duplica; si no, inserta una por finalidad.
 */
export async function registrarConsentimientos(db: SupabaseClient, user: User): Promise<ResultadoAlta> {
  const aceptados = aceptadosDe(user);
  if (!aceptados) return { ok: true, guardados: false };
  const filas = filasDeAlta(user.id, aceptados);
  if (!filas) return { ok: false, error: 'faltan consentimientos' };

  // RLS limita la lectura a las filas propias.
  const previo = await db.from('consents').select('id', { count: 'exact', head: true });
  if (previo.error) return { ok: false, error: 'no se pudieron comprobar los consentimientos' };
  if ((previo.count ?? 0) > 0) return { ok: true, guardados: false };

  const { error } = await db.from('consents').insert(filas);
  return error ? { ok: false, error: 'no se pudieron guardar los consentimientos' } : { ok: true, guardados: true };
}
