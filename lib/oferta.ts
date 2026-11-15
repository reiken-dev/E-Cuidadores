// OFERTA DE LA PLANTILLA — un solo lugar para editar plazos y precios.
// PARA EL COMPRADOR: estos valores son de referencia. Antes de vender, alinéalos con lo que
// configures en tu plataforma de cobro (por ejemplo Hotmart). Importante:
//  - La prueba gratis solo existe si tu plan de suscripción la incluye y suele exigir tarjeta.
//    Si no ofreces prueba, pon TRIAL_DIAS = 0 y los textos dejan de prometerla.
//  - La garantía cuenta desde el PRIMER COBRO (no desde que empieza la prueba) y nunca puede ser menor de 7 días
//    (derecho de arrepentimiento que Hotmart aplica). Lo habitual es 7; Hotmart admite 7, 15, 21 o 30 y debe
//    coincidir con lo que configures en el producto. Los medios de pago los define tu plataforma.

import { MARCA } from './marca';

// Prueba sugerida de 7 días. Antes de vender, confírmala en Hotmart con estos días, cambia el número o quita la prueba (0) hasta que la tengas configurada.
// [VERIFICAR: confirma los días de prueba en tu plataforma de cobro]
export const TRIAL_DIAS = 7;
// Garantía: 7 días, la que da Hotmart. Debe ser el mismo número en el producto de Hotmart.
// [VERIFICAR: confirma la garantía en tu producto de Hotmart; nunca menos de 7]
export const GARANTIA_DIAS = 7;
/**
 * ¿Los precios de abajo son solo de ejemplo? Con false, la plantilla los muestra como precios sugeridos y
 * `npm run verificar` no lo marca. Precios sugeridos: confirma tu oferta en Hotmart antes de vender.
 * Si cambias las cifras, cambia también el producto en Hotmart.
 */
export const PRECIOS_DE_EJEMPLO = false;
export const OFERTA_ES_EJEMPLO = PRECIOS_DE_EJEMPLO;
// Precios sugeridos. Cámbialos aquí y en Hotmart para que coincidan.
// Mensual US$7.99 (apps de salud o seguimiento personal: rango de 4,99 a 9,99). Anual US$79.90 = 10 mensualidades
// (dos meses gratis). Un hogar paga por toda la familia (hermanos ilimitados sin costo), así que el precio refleja
// el valor del círculo completo y se queda por encima de la mitad del rango, sin llegar al tope.
export const PRECIO_MES = 7.99;
export const PRECIO_ANIO = 79.9;

/**
 * Moneda en que muestras los precios. Ej.: 'US$' con 2 decimales · 'MX$' con 2 · '$' con 0 (pesos, con precios en pesos).
 * Debe coincidir con la moneda que cobra tu producto en Hotmart.
 */
export const MONEDA_SIMBOLO = 'US$';
export const MONEDA_DECIMALES = 2;

export const tieneTrial = TRIAL_DIAS > 0;
/** Formatea un precio con la moneda de arriba. (El nombre viene de la primera versión; sirve para cualquier moneda.) */
export const usd = (n: number) => `${MONEDA_SIMBOLO}${n.toFixed(MONEDA_DECIMALES)}`;
export const PRECIO_ANIO_POR_MES = usd(PRECIO_ANIO / 12);
/**
 * Meses que ahorra el anual frente a 12 mensuales, redondeado hacia abajo. Con los precios sugeridos: 2.
 * Se calcula en céntimos enteros: con decimales binarios, 7.99 × 12 − 79.90 ÷ 7.99 da 1.9999… y el texto diría 1.
 */
const aCentimos = (n: number) => Math.round(n * 100);
export const MESES_GRATIS_ANUAL = Math.max(0, Math.floor((aCentimos(PRECIO_MES) * 12 - aCentimos(PRECIO_ANIO)) / aCentimos(PRECIO_MES)));
/** El texto del ahorro sale de los precios: "2 meses gratis". */
export const textoMesesGratis = MESES_GRATIS_ANUAL === 1 ? '1 mes gratis' : `${MESES_GRATIS_ANUAL} meses gratis`;

/** Cuánto tiempo se conservan los datos de una cuenta cancelada (periodo de gracia). Debe coincidir con lo que haga tu servidor. */
export const DIAS_CONSERVAR_DATOS = 90;

/**
 * ¿Tu servidor ya borra los datos pasados los DIAS_CONSERVAR_DATOS días (y los conserva hasta entonces)?
 * Mientras sea false, la app usa un texto que no promete plazos. Ponlo en true SOLO cuando lo hayas
 * conectado (ver supabase/retencion.sql y LISTA-DE-CONEXION.md); `npm run verificar` te lo recuerda.
 */
export const DATOS_CONSERVACION_CONFIRMADA = false;
export const textoConservacion = DATOS_CONSERVACION_CONFIRMADA
  ? `tus datos se conservan ${DIAS_CONSERVAR_DATOS} días`
  : 'podrás pedir una copia de tus datos escribiendo a soporte';

/**
 * ¿Los datos viven en la cuenta (Supabase conectado) o solo en este dispositivo (demostración)? Los textos que hablan
 * de DÓNDE se guarda lo que escribes usan esto, para no decir «no se envía a ningún servidor» cuando sí se envía.
 * (Es independiente de la sincronización entre hermanos, que sigue su propia constante.)
 */
export const DATOS_EN_LA_CUENTA = MARCA.conexiones.supabase;
export const datosTexto = (enLaCuenta: string, local: string) => (DATOS_EN_LA_CUENTA ? enLaCuenta : local);

/**
 * ¿Ya conectaste tu base de datos para que lo que anota un hermano lo vean los demás en SUS teléfonos?
 * Mientras sea false, los textos no prometen que "todos lo ven" (en la plantilla los datos viven en un solo dispositivo).
 * Ponlo en true SOLO cuando la sincronización real funcione (LISTA-DE-CONEXION.md); `npm run verificar` te lo recuerda.
 */
export const SINCRONIZACION_CONECTADA = false;
/** Elige el texto según haya o no sincronización real. */
export const sincroTexto = (conSincronizacion: string, local: string) => (SINCRONIZACION_CONECTADA ? conSincronizacion : local);

/**
 * ¿Ya existe la ruta /unirme/[código] con códigos aleatorios generados en el servidor?
 * Mientras sea false, el mensaje para invitar a un hermano NO lleva enlace (un enlace que da 404 es una promesa rota).
 * Ponlo en true SOLO cuando la ruta funcione (docs/conexion y LISTA-DE-CONEXION.md).
 */
export const INVITACION_CONECTADA = true;

/**
 * Si te cobran una RENOVACIÓN que no esperabas, ¿cuántos días tienen para pedir la devolución?
 * Se escribe en la Política de Reembolsos. Mínimo 7 (derecho de retracto en compras a distancia, que
 * Hotmart aplica). Confirma en tu panel de Hotmart cómo se maneja el reembolso de renovaciones.
 */
export const RENOVACION_REEMBOLSO_DIAS = 7;

/**
 * ¿Ya envías correos reales (enlace de acceso, recordatorios, avisos)? Mientras sea false, las pantallas
 * NO dicen "te enviamos…" porque la plantilla no envía nada. Ponlo en true al conectar Resend y probarlo.
 */
export const CORREOS_CONECTADOS = false;
export const correoTexto = (conCorreos: string, local: string) => (CORREOS_CONECTADOS ? conCorreos : local);
