'use server';

// Invitaciones por enlace (ECU-9). Corre en el servidor: la sesión sale de getUser(), nunca del navegador.
// El alta en members y las invitaciones se escriben con la clave de servicio, a través de funciones SQL que
// vuelven a comprobar todo (supabase/invitaciones.sql). Sin datos de salud en logs ni en las respuestas.
import { tieneConsentimientos } from '@/lib/alta';
import { MAX_MIEMBROS, normalizarCodigo } from '@/lib/invitacion';
import { MARCA } from '@/lib/marca';
import { crearClienteServicio } from '@/lib/supabase/servicio';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { codigoCirculoAleatorio } from '@/lib/codigo-circulo';

export type RespuestaUnirme = { ok: true } | { ok: false; error: string };
export interface InvitacionActiva {
  id: string;
  codigo: string;
  venceEl: string;
}
export type RespuestaInvitacion = { ok: true; invitacion: InvitacionActiva | null } | { ok: false; error: string };

const GENERICO = 'No pudimos completarlo. Vuelve a intentarlo.';
const SESION = 'Tu sesión venció. Vuelve a entrar.';

async function usuarioActual() {
  if (!MARCA.conexiones.supabase) return null;
  const db = await crearClienteServidor();
  if (!db) return null;
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  return { db, userId: data.user.id };
}

/** Quien abre el enlace entra al círculo. El nombre es el que verán sus hermanos. */
export async function unirme(codigo: unknown, nombre: unknown): Promise<RespuestaUnirme> {
  const sesion = await usuarioActual();
  if (!sesion) return { ok: false, error: SESION };
  const c = normalizarCodigo(codigo);
  const n = typeof nombre === 'string' ? nombre.trim() : '';
  if (n.length < 1 || n.length > 80) return { ok: false, error: 'Escribe tu nombre (hasta 80 letras).' };
  if (!c) return { ok: false, error: 'Este enlace no sirve. Pide uno nuevo a quien te invitó.' };
  // Sin los dos consentimientos no se entra al círculo (la página ya manda a /aceptar; aquí se vuelve a exigir).
  if (!(await tieneConsentimientos(sesion.db))) return { ok: false, error: 'Falta aceptar los términos. Recarga la página.' };
  const servicio = crearClienteServicio();
  if (!servicio) return { ok: false, error: GENERICO };
  let data: unknown;
  try {
    const r = await servicio.rpc('unirse_con_codigo', { p_code: c, p_user: sesion.userId, p_name: n });
    if (r.error) return { ok: false, error: GENERICO };
    data = r.data;
  } catch {
    return { ok: false, error: GENERICO };
  }
  switch (data) {
    case 'ok':
      return { ok: true };
    case 'lleno':
      return { ok: false, error: `Este círculo ya tiene ${MAX_MIEMBROS} personas. Habla con quien te invitó.` };
    case 'ya_en_circulo':
      return { ok: false, error: 'Tu cuenta ya pertenece a un círculo. Usa otra cuenta para unirte a este.' };
    default:
      return { ok: false, error: 'Este enlace no sirve o ya venció. Pide uno nuevo a quien te invitó.' };
  }
}

/** Invitación vigente del círculo que creaste, o null. Solo el organizador la ve (RLS). */
export async function leerInvitacion(): Promise<RespuestaInvitacion> {
  const sesion = await usuarioActual();
  if (!sesion) return { ok: false, error: SESION };
  const { data, error } = await sesion.db
    .from('invitations')
    .select('id, code, expires_at')
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return { ok: false, error: GENERICO };
  const f = data?.[0];
  return { ok: true, invitacion: f ? { id: f.id, codigo: f.code, venceEl: f.expires_at } : null };
}

/** Crea un enlace nuevo (el anterior deja de servir). Solo quien creó el círculo. */
export async function crearInvitacion(): Promise<RespuestaInvitacion> {
  const sesion = await usuarioActual();
  if (!sesion) return { ok: false, error: SESION };
  const { data: circulos, error: errC } = await sesion.db.from('circles').select('id').eq('created_by', sesion.userId).limit(1);
  if (errC) return { ok: false, error: GENERICO };
  const circulo = circulos?.[0]?.id;
  if (!circulo) return { ok: false, error: 'Solo quien creó el círculo puede invitar.' };
  const servicio = crearClienteServicio();
  if (!servicio) return { ok: false, error: GENERICO };
  const codigo = codigoCirculoAleatorio();
  const { data, error } = await servicio.rpc('crear_invitacion', { p_circle: circulo, p_user: sesion.userId, p_code: codigo });
  if (error || !data) return { ok: false, error: GENERICO };
  return leerInvitacion();
}

/** Revoca el enlace: deja de servir de inmediato. Solo quien creó el círculo. */
export async function revocarInvitacion(id: unknown): Promise<RespuestaInvitacion> {
  const sesion = await usuarioActual();
  if (!sesion) return { ok: false, error: SESION };
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: GENERICO };
  const servicio = crearClienteServicio();
  if (!servicio) return { ok: false, error: GENERICO };
  const { data, error } = await servicio.rpc('revocar_invitacion', { p_id: id, p_user: sesion.userId });
  if (error || data !== true) return { ok: false, error: GENERICO };
  return leerInvitacion();
}
