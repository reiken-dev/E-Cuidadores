'use server';

// Correo de bienvenida (ECU-4). Corre en el servidor: el correo y el nombre salen de la sesión validada con getUser(),
// nunca de lo que mande el navegador, así que solo puede escribirse a quien tiene la sesión. Solo sale si su círculo
// se acaba de crear (ventana corta) y UNA sola vez: antes de enviar se anota en `app_metadata` de la cuenta (la persona
// no puede editarlo desde el navegador), así repetir la llamada no manda otro correo. Sin datos de salud: la plantilla
// no lleva el nombre del familiar. Mejor esfuerzo: nunca lanza ni bloquea la pantalla.
import { enviarCorreo } from '@/lib/enviar-correo';
import { MARCA } from '@/lib/marca';
import { crearClienteServicio } from '@/lib/supabase/servicio';
import { crearClienteServidor } from '@/lib/supabase/servidor';

const VENTANA_MS = 10 * 60 * 1000;

export async function enviarBienvenida(): Promise<{ enviado: boolean }> {
  try {
    if (!MARCA.conexiones.supabase || !MARCA.conexiones.resend) return { enviado: false };
    const db = await crearClienteServidor();
    if (!db) return { enviado: false };
    const { data, error } = await db.auth.getUser();
    if (error || !data.user?.email) return { enviado: false };
    const { data: circulos, error: errC } = await db.from('circles').select('created_at').eq('created_by', data.user.id).order('created_at', { ascending: false }).limit(1);
    const creado = circulos?.[0]?.created_at ? Date.parse(circulos[0].created_at) : NaN;
    if (errC || !Number.isFinite(creado) || Date.now() - creado > VENTANA_MS) return { enviado: false };
    const meta = data.user.user_metadata as { name?: unknown } | null;
    const nombre = typeof meta?.name === 'string' ? (meta.name.trim().split(/\s+/)[0] ?? '') : '';
    const marcas = (data.user.app_metadata ?? {}) as Record<string, unknown>;
    if (marcas.bienvenida_enviada) return { enviado: false };
    // Se marca ANTES de enviar: dos llamadas seguidas no pueden mandar dos correos. Si el envío falla, se intenta deshacer.
    const servicio = crearClienteServicio();
    if (!servicio) return { enviado: false };
    const { error: errMarca } = await servicio.auth.admin.updateUserById(data.user.id, { app_metadata: { ...marcas, bienvenida_enviada: true } });
    if (errMarca) return { enviado: false };
    const enviado = await enviarCorreo('bienvenida', data.user.email, { nombre: nombre || 'bienvenido' });
    if (!enviado) await servicio.auth.admin.updateUserById(data.user.id, { app_metadata: { ...marcas, bienvenida_enviada: false } }).catch(() => {});
    return { enviado };
  } catch {
    return { enviado: false };
  }
}
