// HOTMART — lógica PURA para el webhook (sin red, sin base de datos): verificar la firma, normalizar el
// aviso y traducirlo al estado de la suscripción. La ruta que lo usa (ver docs/conexion/hotmart-webhook.ts.txt)
// solo agrega la parte con servicios: leer el cuerpo, guardar en Supabase y enviar correos.
//
// ⚠️ Los nombres de campos siguen el formato "2.0.0" del webhook de Hotmart. Antes de vender, envía un aviso
// de prueba desde tu panel y compara con `extraerAviso` (si cambia un campo, solo se ajusta aquí).

import { createHash, timingSafeEqual } from 'node:crypto';

export type EstadoSuscripcion = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'refunded' | 'chargeback';

/** Traduce el evento de Hotmart al estado que guarda `subscriptions.status`. null = no cambia el estado. */
export function estadoDeEvento(evento: string): EstadoSuscripcion | null {
  switch (evento) {
    case 'PURCHASE_APPROVED':
    case 'PURCHASE_COMPLETE':
      return 'active';
    case 'PURCHASE_DELAYED': // cobro rechazado o atrasado: se conserva el acceso y se avisa (dunning)
      return 'past_due';
    case 'PURCHASE_CANCELED':
    case 'SUBSCRIPTION_CANCELLATION':
      return 'canceled'; // conserva el acceso hasta el fin del periodo ya pagado
    case 'PURCHASE_EXPIRED':
      return 'expired';
    case 'PURCHASE_REFUNDED':
      return 'refunded';
    case 'PURCHASE_CHARGEBACK':
      return 'chargeback';
    default:
      return null;
  }
}

/** ¿Este evento significa que hay que mandar el correo de pago fallido? */
export const esCobroFallido = (evento: string) => evento === 'PURCHASE_DELAYED';

/** ¿Este evento dispara el correo de cancelación (con la encuesta de una pregunta)? */
export const esCancelacion = (evento: string) => evento === 'SUBSCRIPTION_CANCELLATION' || evento === 'PURCHASE_CANCELED';

/** Comparación en tiempo constante: se comparan los hashes (misma longitud siempre), así no se filtra ni el largo del HOTTOK. */
export function hottokValido(recibido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!recibido || !esperado) return false;
  const a = createHash('sha256').update(String(recibido)).digest();
  const b = createHash('sha256').update(String(esperado)).digest();
  return timingSafeEqual(a, b);
}

/** Variables que el webhook necesita. Si falta alguna (o está en blanco), la ruta responde 503: Hotmart reintenta, nunca 200 ni 401. */
export function faltaConfiguracionHotmart(env: Record<string, string | undefined>): string[] {
  return ['HOTMART_HOTTOK', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !env[k]?.trim());
}

export interface AvisoHotmart {
  evento: string;
  transaccion: string;
  correo: string;
  /** Importe en la unidad menor (centavos), siempre entero. null si el aviso no lo trae. */
  importeMinimo: number | null;
  moneda: string | null;
  productoId: string | null;
  /** null = el nombre del plan no se reconoce. No se asume ninguno (ver planAGuardar). */
  plan: 'mensual' | 'anual' | null;
  codigoSuscriptor: string | null;
  /** Hasta cuándo tiene acceso pagado (ISO), si el aviso lo trae. null = no viene o no se pudo leer. */
  finPeriodo: string | null;
}

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);

/** Milisegundos desde 1970 (número o texto de dígitos) a fecha ISO. null si no es una fecha válida. */
export function fechaDesdeMs(v: unknown): string | null {
  // Hotmart documenta milisegundos, pero algún ejemplo oficial manda la fecha como texto ISO ("2022-09-01T12:00:00.000Z").
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) {
    const t = Date.parse(v.trim());
    return Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : null;
  }
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Plan que se guarda: el que dice Hotmart o "desconocido". Nunca se asume "mensual" (si Hotmart cambia el nombre, se ve). */
export const planAGuardar = (plan: AvisoHotmart['plan']): 'mensual' | 'anual' | 'desconocido' => plan ?? 'desconocido';

/** Decimales con que se cobra cada moneda. Las que se cobran sin centavos no se multiplican por 100
 *  (verifícalo con un aviso de prueba). El resto, 2. */
const SIN_CENTAVOS = new Set(['CLP', 'COP', 'JPY', 'KRW', 'PYG', 'VND']);
export function decimalesDe(moneda: string | null): number {
  return moneda && SIN_CENTAVOS.has(moneda.toUpperCase()) ? 0 : 2;
}

/** Normaliza el cuerpo del aviso. Devuelve null si falta lo indispensable (evento, transacción o correo). */
export function extraerAviso(cuerpo: unknown): AvisoHotmart | null {
  const raiz = rec(cuerpo);
  const data = rec(raiz.data);
  const evento = texto(raiz.event);
  const compra = rec(data.purchase);
  const suscripcion = rec(data.subscription);
  // SUBSCRIPTION_CANCELLATION no trae `purchase` ni `buyer`: el correo viene en `subscriber` y no hay código de transacción.
  // [VERIFICAR: estas rutas de SUBSCRIPTION_CANCELLATION coinciden con un SDK no oficial que modela la documentación 2.0.0; confírmalas con un aviso real de Hotmart.]
  // En ese caso la clave de idempotencia se arma con la suscripción y la fecha de cancelación (un reintento da la misma),
  // y si tampoco están, con el id del evento.
  const subscriber = rec(data.subscriber);
  const idSuscripcion = texto(suscripcion.id);
  const fechaCancelacion = texto(data.cancellation_date);
  const transaccion =
    texto(compra.transaction) ??
    (idSuscripcion && fechaCancelacion ? `SUB-${idSuscripcion}-${fechaCancelacion}` : null) ??
    (texto(raiz.id) ? `EVT-${texto(raiz.id)}` : null);
  const correo = (texto(rec(data.buyer).email) ?? texto(subscriber.email))?.toLowerCase() ?? null;
  if (!evento || !transaccion || !correo || !correo.includes('@')) return null;

  const precio = rec(compra.price);
  const valor = typeof precio.value === 'number' ? precio.value : Number(precio.value);
  const moneda = texto(precio.currency_value) ?? texto(precio.currency);
  const importeMinimo = Number.isFinite(valor) ? Math.round(valor * 10 ** decimalesDe(moneda)) : null;

  // [VERIFICAR: nombres de plan. Confirma con un aviso de prueba de cada plan; si no coincide, queda "desconocido".]
  const nombrePlan = (texto(rec(suscripcion.plan).name) ?? '').toLowerCase();
  const plan = /anual|annual|year/.test(nombrePlan) ? 'anual' : /mensual|month/.test(nombrePlan) ? 'mensual' : null;

  return {
    evento,
    transaccion,
    correo,
    importeMinimo,
    moneda,
    productoId: texto(rec(data.product).id),
    plan,
    codigoSuscriptor: texto(rec(suscripcion.subscriber).code) ?? texto(subscriber.code),
    // [VERIFICAR: ruta y unidad (ms) de la fecha de fin de periodo. Los indicios de la documentación de Hotmart
    // apuntan a date_next_charge en milisegundos, pero la ruta exacta no está confirmada. Con un aviso de prueba
    // confirma en qué campo llega. Si no llega, finPeriodo es null y el webhook NO toca current_period_end.]
    finPeriodo: fechaDesdeMs(data.date_next_charge ?? compra.date_next_charge),
  };
}

/** Un pago llega en varios avisos (aprobado, completo…). Solo PURCHASE_APPROVED cuenta como ingreso: una vez por transacción. */
export const cuentaComoIngreso = (evento: string) => evento === 'PURCHASE_APPROVED';

/** Importe que el aviso suma (+) o resta (−) en el libro de ingresos. null = el aviso no mueve el libro. */
export function importeContable(evento: string, importeMinimo: number | null): number | null {
  if (importeMinimo === null) return null;
  if (cuentaComoIngreso(evento)) return importeMinimo;
  if (evento === 'PURCHASE_REFUNDED' || evento === 'PURCHASE_CHARGEBACK') return -importeMinimo;
  return null;
}

/** ¿Este aviso es del producto que se vende aquí? Con `HOTMART_PRODUCT_ID` definido, los avisos de otros productos de la
 *  misma cuenta de Hotmart se ignoran (el HOTTOK es de toda la cuenta). Sin definirlo, no se filtra. */
export function productoPermitido(productoId: string | null, permitido: string | null | undefined): boolean {
  const esperado = permitido?.trim();
  if (!esperado) return true;
  return productoId === esperado;
}

const AVISOS_DE_ALTA = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_DELAYED']);
const COMPRA_PAGADA = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']);
const COMPRA_REVERTIDA = new Set(['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK']);
const PEDIDO_NO_PAGADO = new Set(['PURCHASE_CANCELED', 'PURCHASE_EXPIRED']);

/**
 * ¿Este aviso debe cambiar el estado de la suscripción? `eventosPrevios` son los avisos ya anotados de la MISMA transacción.
 * El aviso siempre se anota (para no reprocesarlo); esto solo decide si toca el estado.
 * - Un aviso de alta (aprobado, completo, atrasado) que llega DESPUÉS de un reembolso o contracargo de esa transacción
 *   no devuelve el acceso (reintentos de Hotmart o avisos fuera de orden).
 * - Cancelado o vencido de un pedido que nunca se pagó (p. ej. un boleto abandonado) no toca una suscripción que ya está activa.
 */
export function debeAplicarEstado(evento: string, eventosPrevios: string[]): boolean {
  if (AVISOS_DE_ALTA.has(evento) && eventosPrevios.some((e) => COMPRA_REVERTIDA.has(e))) return false;
  if (PEDIDO_NO_PAGADO.has(evento) && !eventosPrevios.some((e) => COMPRA_PAGADA.has(e))) return false;
  return true;
}
