// Enlace de baja de los correos de marketing (ECU-6). El enlace lleva el id de la persona firmado con HMAC-SHA256 y
// BAJA_SECRET: nadie puede dar de baja a otra persona adivinando un id. Sin datos de salud: solo el id de la cuenta.
// BAJA_SECRET es APARTE de CRON_SECRET: rotar uno no invalida los enlaces ya enviados en correos del otro.
import { createHmac, timingSafeEqual } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRETO_MINIMO = 32;

const firma = (userId: string, secreto: string) => createHmac('sha256', secreto).update(`baja:${userId.toLowerCase()}`).digest('base64url');
const secretoValido = (s: string | undefined): s is string => typeof s === 'string' && s.length >= SECRETO_MINIMO;

/** `<id>.<firma>` o null si falta un secreto de 32+ caracteres o el id no es un uuid. */
export function firmarBaja(userId: string, secreto: string | undefined): string | null {
  if (!secretoValido(secreto) || !UUID_RE.test(userId)) return null;
  return `${userId.toLowerCase()}.${firma(userId, secreto)}`;
}

/** El id de la persona si la firma es auténtica; null en cualquier otro caso (sin pistas de por qué). */
export function verificarBaja(token: unknown, secreto: string | undefined): string | null {
  if (!secretoValido(secreto) || typeof token !== 'string' || token.length > 200) return null;
  const [id, f, resto] = token.split('.');
  if (resto !== undefined || !id || !f || !UUID_RE.test(id)) return null;
  const esperada = Buffer.from(firma(id, secreto));
  const recibida = Buffer.from(f);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida) ? id.toLowerCase() : null;
}

/** Enlaces de baja de una persona: la página de confirmación y la ruta de baja con un clic (List-Unsubscribe). */
export function urlsDeBaja(userId: string, secreto: string | undefined, sitioUrl: string): { pagina: string; unClic: string } | null {
  const token = firmarBaja(userId, secreto);
  if (!token) return null;
  const base = sitioUrl.replace(/\/$/, '');
  return { pagina: `${base}/baja?t=${encodeURIComponent(token)}`, unClic: `${base}/api/baja?t=${encodeURIComponent(token)}` };
}
