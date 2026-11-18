'use server';

// Baja de los correos de marketing. Corre en el servidor: la identidad sale del enlace FIRMADO (lib/baja.ts), no de lo que
// mande el navegador. No hace falta sesión: quien recibe el correo puede darse de baja sin entrar. Idempotente.
import { verificarBaja } from '@/lib/baja';
import { crearClienteServicio } from '@/lib/supabase/servicio';

export async function confirmarBaja(token: unknown): Promise<{ ok: boolean }> {
  try {
    const id = verificarBaja(token, process.env.BAJA_SECRET);
    if (!id) return { ok: false };
    const servicio = crearClienteServicio();
    if (!servicio) return { ok: false };
    const { error } = await servicio.rpc('darse_de_baja', { p_user: id });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
