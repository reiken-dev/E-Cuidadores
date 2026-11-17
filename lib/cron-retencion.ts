// CRON DE RETENCIÓN — la lógica (la ruta app/api/cron/retencion solo autentica y la llama).
// Correos de marketing sin culpa y sin datos de salud: pagador fantasma (14+ días sin actividad, una vez por episodio)
// y resumen semanal (domingos, solo con actividad). Cada envío se RESERVA antes en la base (supabase/cron-retencion.sql):
// respeta la baja, un correo al día por persona y nada se repite. Sin console: los errores podrían traer correos.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { urlsDeBaja } from './baja';
import { enviarCorreo, resendConfigurado } from './enviar-correo';

/** Máximo por secuencia y corrida: el bucle es secuencial y la función tiene 60 s. Con el orden pseudoaleatorio diario, todos se atienden con los días. */
export const TOPE_POR_CORRIDA = 40;
/** Presupuesto de tiempo del bucle de envío: se corta antes del límite de la función para no dejar reservas sin correo. */
export const PRESUPUESTO_MS = 45_000;

/** `Authorization: Bearer <secreto>` en tiempo constante (se comparan huellas de igual largo). */
export function bearerValido(cabecera: string | null, secreto: string | undefined): boolean {
  if (!secreto || !cabecera) return false;
  const huella = (t: string) => createHash('sha256').update(t).digest();
  return timingSafeEqual(huella(cabecera), huella(`Bearer ${secreto}`));
}

interface Contador {
  candidatos: number;
  enviados: number;
}
export interface ResultadoCron {
  ok: true;
  simulacion: boolean;
  marketing: boolean;
  pagador: Contador;
  resumen: Contador & { omitido?: 'no es domingo' };
  /** Reservas que fallaron (se siguió con los demás). */
  errores: number;
  /** true si se cortó por tiempo: los que faltan se atienden en la siguiente corrida. */
  cortado: boolean;
}
export type RespuestaCron = ResultadoCron | { ok: false; motivo: 'lectura' | 'configuracion' };

interface Opciones {
  simular: boolean;
  marketingActivo: boolean;
  ahora: Date;
  secretoBaja: string | undefined;
  /** CRON_SECRET: BAJA_SECRET no puede ser el mismo. */
  secretoCron?: string;
  sitioUrl: string;
  /** Reloj en ms (se inyecta en las pruebas). */
  reloj?: () => number;
}
interface CandidatoFantasma {
  user_id: string;
  email: string;
  clave: string;
}
interface CandidatoResumen extends CandidatoFantasma {
  dosis: number;
}

export async function ejecutarRetencion(db: SupabaseClient, o: Opciones): Promise<RespuestaCron> {
  const esDomingo = o.ahora.getUTCDay() === 0;
  const f = await db.rpc('candidatos_pagador_fantasma', { p_limite: TOPE_POR_CORRIDA });
  if (f.error) return { ok: false, motivo: 'lectura' };
  const fantasmas = (f.data ?? []) as CandidatoFantasma[];
  let resumen: CandidatoResumen[] = [];
  if (esDomingo) {
    const r = await db.rpc('candidatos_resumen_semanal', { p_limite: TOPE_POR_CORRIDA });
    if (r.error) return { ok: false, motivo: 'lectura' };
    resumen = (r.data ?? []) as CandidatoResumen[];
  }

  const salida: ResultadoCron = {
    ok: true,
    simulacion: o.simular,
    marketing: o.marketingActivo,
    pagador: { candidatos: fantasmas.length, enviados: 0 },
    resumen: { candidatos: resumen.length, enviados: 0, ...(esDomingo ? {} : { omitido: 'no es domingo' as const }) },
    errores: 0,
    cortado: false,
  };
  // Simulación o marketing apagado: solo se cuentan los candidatos. No se reserva ni se envía nada.
  if (o.simular || !o.marketingActivo) return salida;
  if (fantasmas.length + resumen.length > 0) {
    // Sin una baja válida, sin Resend o con enlaces a localhost no se envía marketing: un fallo de configuración NO se
    // disfraza de «0 enviados» (antes se reservaba y liberaba a cada candidato, cada día, sin enviar nada).
    const sitioMal = !/^https:\/\//i.test(o.sitioUrl) || /^https:\/\/(localhost|127\.|\[::1\])/i.test(o.sitioUrl);
    const secretoRepetido = Boolean(o.secretoCron) && o.secretoCron === o.secretoBaja;
    if (!urlsDeBaja('00000000-0000-4000-8000-000000000000', o.secretoBaja, o.sitioUrl) || !resendConfigurado() || sitioMal || secretoRepetido) {
      return { ok: false, motivo: 'configuracion' };
    }
  }
  const reloj = o.reloj ?? Date.now;
  const inicio = reloj();

  async function enviarA(
    c: CandidatoFantasma,
    secuencia: 'pagador_fantasma' | 'resumen_semanal',
    valores: Record<string, number>
  ): Promise<'enviado' | 'omitido' | 'error'> {
    const reserva = await db.rpc('reservar_envio', { p_user: c.user_id, p_secuencia: secuencia, p_clave: c.clave });
    if (reserva.error) return 'error';
    if (reserva.data !== true) return 'omitido'; // de baja, ya recibió un correo hoy o ya se envió
    const urls = urlsDeBaja(c.user_id, o.secretoBaja, o.sitioUrl);
    const enviado = urls
      ? await enviarCorreo(secuencia, c.email, valores, { bajaUrl: urls.pagina, bajaUnClic: urls.unClic, idempotencia: `${secuencia}/${c.user_id}/${c.clave}` })
      : false;
    if (!enviado) await db.rpc('liberar_envio', { p_user: c.user_id, p_secuencia: secuencia, p_clave: c.clave });
    return enviado ? 'enviado' : 'omitido';
  }

  // El de pago (fantasma) va primero: si dos coinciden el mismo día, gana ese (un correo al día).
  const lotes: [CandidatoFantasma[], 'pagador_fantasma' | 'resumen_semanal'][] = [
    [fantasmas, 'pagador_fantasma'],
    [resumen, 'resumen_semanal'],
  ];
  for (const [lista, secuencia] of lotes) {
    for (const c of lista) {
      if (reloj() - inicio > PRESUPUESTO_MS) {
        salida.cortado = true;
        return salida;
      }
      const r = await enviarA(c, secuencia, secuencia === 'resumen_semanal' ? { dosis: (c as CandidatoResumen).dosis } : {});
      if (r === 'error') salida.errores++; // un caso que falle no deja sin correo a todos los demás
      else if (r === 'enviado') salida[secuencia === 'pagador_fantasma' ? 'pagador' : 'resumen'].enviados++;
    }
  }
  return salida;
}
