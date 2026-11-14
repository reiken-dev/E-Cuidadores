'use server';

// Guarda los consentimientos de la persona con sesión. Corre en el servidor: user_id sale de la sesión
// validada con getUser(), nunca de lo que mande el navegador, y RLS vuelve a comprobarlo al insertar.
import { guardarConsentimientos } from '@/lib/alta';
import { MARCA } from '@/lib/marca';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export async function aceptarConsentimientos(aceptados: {
  terminos: boolean;
  salud: boolean;
} | null | undefined): Promise<{ ok: true } | { ok: false; error: string }> {
  const generico = 'No pudimos guardar tus aceptaciones. Vuelve a intentarlo.';
  if (!MARCA.conexiones.supabase) return { ok: false, error: generico };
  const db = await crearClienteServidor();
  if (!db) return { ok: false, error: generico };
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { ok: false, error: 'Tu sesión venció. Vuelve a entrar.' };
  const r = await guardarConsentimientos(db, data.user.id, {
    terminos: aceptados?.terminos === true,
    salud: aceptados?.salud === true,
  });
  return r.ok ? { ok: true } : { ok: false, error: generico };
}
