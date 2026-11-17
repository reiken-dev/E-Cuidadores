// ENVÍO DE CORREOS con Resend (solo servidor). Usa renderCorreo() de lib/correos.ts: asunto y texto ya vienen limpios.
// Falla cerrado: sin `conexiones.resend`, sin RESEND_API_KEY o sin EMAIL_FROM no envía nada y devuelve false.
// Nunca lanza (un correo que falla no debe romper un webhook ni una acción) y no escribe nada en logs:
// el error podría traer el correo de la persona. La clave solo viaja en la cabecera Authorization, nunca en el cuerpo.
import { renderCorreo, type SecuenciaId, type Valores } from './correos';
import { MARCA } from './marca';

const CORREO_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
const ESPERA_MS = 5000; // el webhook espera este envío: que no pase del plazo de respuesta de Hotmart

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML sencillo y seguro: todo valor va escapado y el único enlace es el botón (un solo destino de la propia app). */
function armarHtml(texto: string, boton: { texto: string; url: string }, bajaUrl: string | null): string {
  const parrafos = texto
    .split('\n\n')
    // La línea de baja ya va como enlace aparte: no se repite como texto suelto.
    .filter((p) => !p.startsWith('Si ya no quieres estos correos'))
    .map((p) => `<p>${escapar(p)}</p>`)
    .join('');
  const baja = bajaUrl ? `<p style="font-size:14px;color:#4B5B78"><a href="${escapar(bajaUrl)}">Darme de baja de estos correos</a></p>` : '';
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0E1B33;font-size:16px;line-height:1.5">${parrafos}<p><a href="${escapar(boton.url)}" style="background:#1F5BD6;color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none;display:inline-block">${escapar(boton.texto)}</a></p>${baja}</div>`;
}

/** ¿Resend está conectado y con clave y remitente? Los envíos masivos lo comprueban antes de empezar. */
export function resendConfigurado(): boolean {
  return Boolean(MARCA.conexiones.resend && process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Envía un correo de la lista de secuencias. true = Resend lo aceptó; false = no se envió (apagado, mal configurado o falló). */
export async function enviarCorreo(
  id: SecuenciaId,
  para: string,
  valores: Valores = {},
  /** bajaUrl: página de baja (obligatoria en marketing). bajaUnClic: ruta POST de baja con un clic para las cabeceras List-Unsubscribe. */
  opciones: { bajaUrl?: string; bajaUnClic?: string; idempotencia?: string } = {}
): Promise<boolean> {
  try {
    const clave = process.env.RESEND_API_KEY;
    const de = process.env.EMAIL_FROM;
    if (!MARCA.conexiones.resend || !clave || !de) return false;
    if (typeof para !== 'string' || para.length > 254 || !CORREO_RE.test(para)) return false;
    const c = renderCorreo(id, valores, { bajaUrl: opciones.bajaUrl });
    // Cabeceras de baja con un clic (RFC 8058): Gmail y Outlook muestran su propio botón «Cancelar suscripción».
    const cabecerasBaja =
      c.bajaUrl && opciones.bajaUnClic
        ? { 'List-Unsubscribe': `<${opciones.bajaUnClic}>, <${c.bajaUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        : undefined;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clave}`,
        'Content-Type': 'application/json',
        // Con la misma clave, Resend no entrega dos veces aunque se reintente tras un corte (24 h).
        ...(opciones.idempotencia ? { 'Idempotency-Key': opciones.idempotencia.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: de,
        reply_to: MARCA.soporteEmail,
        to: [para],
        subject: c.asunto,
        text: c.texto,
        html: armarHtml(c.texto, c.boton, c.bajaUrl),
        ...(cabecerasBaja ? { headers: cabecerasBaja } : {}),
      }),
      signal: AbortSignal.timeout(ESPERA_MS),
    });
    return r.ok;
  } catch {
    return false;
  }
}
