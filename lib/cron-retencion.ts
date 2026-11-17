// CRON DE RETENCIÓN — la lógica (la ruta app/api/cron/retencion solo autentica y la llama).
// Correos de marketing sin culpa y sin datos de salud: pagador fantasma (14+ días sin actividad, una vez por episodio)
// y resumen semanal (domingos, solo con actividad). Cada envío se RESERVA antes en la base (supabase/cron-retencion.sql):
// respeta la baja, un correo al día por persona y nada se repite. Sin console: los errores podrían traer correos.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { urlsDeBaja } from './baja';
import { enviarCorreo } from './enviar-correo';

export const TOPE_POR_CORRIDA = 200;

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
}
export type RespuestaCron = ResultadoCron | { ok: false; motivo: 'lectura' | 'configuracion' | 'reserva' };

interface Opciones {
  simular: boolean;
  marketingActivo: boolean;
  ahora: Date;
  secretoBaja: string | undefined;
  sitioUrl: string;
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
  };
  // Simulación o marketing apagado: solo se cuentan los candidatos. No se reserva ni se envía nada.
  if (o.simular || !o.marketingActivo) return salida;
  if (fantasmas.length + resumen.length > 0 && !urlsDeBaja('00000000-0000-4000-8000-000000000000', o.secretoBaja, o.sitioUrl)) {
    return { ok: false, motivo: 'configuracion' }; // sin BAJA_SECRET no se envía marketing: no habría baja válida
  }

  async function enviarA(
    c: CandidatoFantasma,
    secuencia: 'pagador_fantasma' | 'resumen_semanal',
    valores: Record<string, number>
  ): Promise<'enviado' | 'omitido' | 'error'> {
    const reserva = await db.rpc('reservar_envio', { p_user: c.user_id, p_secuencia: secuencia, p_clave: c.clave });
    if (reserva.error) return 'error';
    if (reserva.data !== true) return 'omitido'; // de baja, ya recibió un correo hoy o ya se envió
    const urls = urlsDeBaja(c.user_id, o.secretoBaja, o.sitioUrl);
    const enviado = urls ? await enviarCorreo(secuencia, c.email, valores, { bajaUrl: urls.pagina, bajaUnClic: urls.unClic }) : false;
    if (!enviado) await db.rpc('liberar_envio', { p_user: c.user_id, p_secuencia: secuencia, p_clave: c.clave });
    return enviado ? 'enviado' : 'omitido';
  }

  // El de pago (fantasma) va primero: si dos coinciden el mismo día, gana ese (un correo al día).
  for (const c of fantasmas) {
    const r = await enviarA(c, 'pagador_fantasma', {});
    if (r === 'error') return { ok: false, motivo: 'reserva' };
    if (r === 'enviado') salida.pagador.enviados++;
  }
  for (const c of resumen) {
    const r = await enviarA(c, 'resumen_semanal', { dosis: c.dosis });
    if (r === 'error') return { ok: false, motivo: 'reserva' };
    if (r === 'enviado') salida.resumen.enviados++;
  }
  return salida;
}
