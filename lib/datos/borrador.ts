// BORRADOR DEL PRIMER CÍRCULO. El recorrido de bienvenida pide el nombre del familiar y la primera medicina ANTES de
// que exista la cuenta, pero el círculo solo se puede crear con sesión (y con la compra activa). Este borrador guarda
// esas respuestas en este navegador hasta que se crea el círculo en /bienvenida, y se borra en cuanto se usa.
// Va en localStorage (y no en sessionStorage) porque el correo de confirmación suele abrirse en OTRA pestaña.
// Solo se escribe si la persona ya dio su autorización de datos de salud en el recorrido.
// Caduca a las 24 h y se borra al cerrar sesión: otra persona que use este navegador no debe verlo precargado.
export const BORRADOR_KEY = 'entre-hermanos:borrador-circulo:v1';
export const VIGENCIA_BORRADOR_MS = 24 * 60 * 60 * 1000;

export interface Borrador {
  nombreFamiliar: string;
  parentesco: string;
  tuNombre: string;
  medicina: string;
  /** 'HH:MM' (24 h) */
  hora: string;
}

const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function guardarBorrador(b: Borrador, ahora: number = Date.now()): void {
  try {
    window.localStorage.setItem(BORRADOR_KEY, JSON.stringify({ ...b, guardadoEn: ahora }));
  } catch {
    // Sin almacenamiento: en /bienvenida la persona escribe los datos de nuevo.
  }
}

export function leerBorrador(ahora: number = Date.now()): Borrador | null {
  try {
    const raw = window.localStorage.getItem(BORRADOR_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p || typeof p !== 'object') return null;
    // Sin fecha o vencido: se descarta y se borra (también cubre borradores de una versión anterior).
    if (typeof p.guardadoEn !== 'number' || ahora - p.guardadoEn > VIGENCIA_BORRADOR_MS || p.guardadoEn > ahora + 60_000) {
      borrarBorrador();
      return null;
    }
    return {
      nombreFamiliar: texto(p.nombreFamiliar, 80),
      parentesco: texto(p.parentesco, 40),
      tuNombre: texto(p.tuNombre, 80),
      medicina: texto(p.medicina, 80),
      hora: typeof p.hora === 'string' && HORA_RE.test(p.hora) ? p.hora : '08:00',
    };
  } catch {
    return null;
  }
}

export function borrarBorrador(): void {
  try {
    window.localStorage.removeItem(BORRADOR_KEY);
  } catch {
    // Nada que borrar si no hay acceso al almacenamiento.
  }
}
