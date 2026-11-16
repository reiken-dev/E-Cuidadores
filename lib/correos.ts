// CORREOS DE RETENCIÓN — lógica PURA: arma asunto y texto de cada secuencia (docs/retencion/CORREOS.md).
// No envía nada. El envío real (Resend) está en docs/conexion/resend-correos.ts.txt.
//
// Reglas de seguridad y ética, probadas en correos.test.ts:
//  · Solo se usan variables de la lista blanca (VARIABLES): nunca nombres de medicinas ni datos clínicos.
//  · Un correo de marketing SIEMPRE lleva enlace para darse de baja; los de cobro/cuenta no son marketing.
//  · Los valores se limpian (sin saltos de línea ni HTML) antes de entrar en asunto o cuerpo.

import { MARCA } from './marca';

export const VARIABLES = ['nombre', 'familiar', 'n', 'dosis', 'dias', 'fecha', 'enlace', 'marca'] as const;
export type Variable = (typeof VARIABLES)[number];
export type Valores = Partial<Record<Variable, string | number>>;

export type SecuenciaId =
  | 'bienvenida'
  | 'invitar_hermano'
  | 'primera_semana'
  | 'resumen_semanal'
  | 'pagador_fantasma'
  | 'pago_fallido'
  | 'cancelacion';

interface Plantilla {
  asunto: string;
  /** Párrafos. {{variable}} se reemplaza; cada párrafo se separa con una línea en blanco. */
  cuerpo: string[];
  boton: { texto: string; ruta: string };
  /** true = marketing/retención: exige enlace de baja. false = transaccional (cuenta o cobro). */
  marketing: boolean;
}

export const PLANTILLAS: Record<SecuenciaId, Plantilla> = {
  bienvenida: {
    // Sin el nombre del familiar: este correo sale del servidor y no lleva datos de salud ni de la familia.
    asunto: 'Te damos la bienvenida a {{marca}}, {{nombre}}',
    cuerpo: ['Qué bueno tenerte aquí.', 'Tu panel ya está listo: desde Hoy puedes anotar cada dosis con tu nombre y la hora.'],
    boton: { texto: 'Abrir mi panel', ruta: '/app' },
    marketing: false,
  },
  invitar_hermano: {
    asunto: '¿Con quién comparten el cuidado de {{familiar}}?',
    cuerpo: ['Entre más hermanos en el círculo, menos se pierde.', 'Puedes invitar a uno desde Familia y enviarle el mensaje por WhatsApp.'],
    boton: { texto: 'Invitar a un hermano', ruta: '/app/familia?invitar=1' },
    marketing: true,
  },
  primera_semana: {
    asunto: 'Ya van {{n}} dosis con nombre y hora',
    cuerpo: ['En este tiempo el círculo de {{familiar}} registró {{n}} dosis.', 'Cuando quieras, revisa la semana completa.'],
    boton: { texto: 'Ver la semana del círculo', ruta: '/app/semana' },
    marketing: true,
  },
  resumen_semanal: {
    asunto: 'La semana del círculo de {{familiar}}',
    cuerpo: ['Esta semana el círculo de {{familiar}} registró {{dosis}} dosis.', 'Registrar también lo que no se pudo dar cuenta: es parte de cuidar bien.'],
    boton: { texto: 'Ver la semana completa', ruta: '/app/semana' },
    marketing: true,
  },
  pagador_fantasma: {
    asunto: '{{familiar}} sigue en tu círculo',
    cuerpo: ['Retomar es fácil: la próxima dosis te espera.'],
    boton: { texto: 'Abrir Hoy', ruta: '/app' },
    marketing: true,
  },
  pago_fallido: {
    asunto: 'No pudimos cobrar tu pago',
    cuerpo: ['No pudimos cobrar tu último pago. Actualiza tu medio de pago en Hotmart para mantener el acceso.', 'Este cobro no borra lo que anotaron.'],
    boton: { texto: 'Actualizar el medio de pago', ruta: '/app/plan' },
    marketing: false,
  },
  cancelacion: {
    asunto: 'Tu suscripción quedó cancelada',
    cuerpo: ['Gracias por habernos dejado acompañarlos.', 'Si quieres, cuéntanos qué podríamos mejorar respondiendo este correo. Puedes volver cuando quieras.'],
    boton: { texto: 'Guardar el resumen para el médico', ruta: '/app/resumen' },
    marketing: false,
  },
};

/** Quita saltos de línea y caracteres de marcado: un nombre malicioso no puede inyectar encabezados ni HTML. */
export function limpiar(v: string | number | undefined): string {
  return String(v ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[<>&"']/g, '')
    .trim()
    .slice(0, 80);
}

function rellenar(texto: string, valores: Valores): string {
  // {{marca}} es siempre el nombre de la app (lib/marca.ts); el resto sale de la lista blanca y se limpia.
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    k === 'marca' ? limpiar(MARCA.nombre) : (VARIABLES as readonly string[]).includes(k) ? limpiar(valores[k as Variable]) : ''
  );
}

export interface CorreoListo {
  asunto: string;
  texto: string;
  boton: { texto: string; url: string };
  /** null en correos de cuenta/cobro. */
  bajaUrl: string | null;
}

/**
 * Arma el correo. `bajaUrl` (con tu firma de baja) es obligatorio si la secuencia es de marketing;
 * si falta, lanza error: así es imposible enviar retención sin opción de darse de baja.
 */
export function renderCorreo(id: SecuenciaId, valores: Valores, opciones: { bajaUrl?: string } = {}): CorreoListo {
  const p = PLANTILLAS[id];
  if (p.marketing && !opciones.bajaUrl) throw new Error(`El correo "${id}" es de retención y necesita bajaUrl`);
  const base = MARCA.sitioUrl.replace(/\/$/, '');
  const asunto = rellenar(p.asunto, valores).replace(/\s+/g, ' ').trim();
  const texto = p.cuerpo.map((c) => rellenar(c, valores).replace(/\s+/g, ' ').trim()).join('\n\n');
  return {
    asunto,
    texto: p.marketing ? `${texto}\n\nSi ya no quieres estos correos, puedes darte de baja: ${opciones.bajaUrl}` : texto,
    boton: { texto: p.boton.texto, url: `${base}${p.boton.ruta}` },
    bajaUrl: p.marketing ? (opciones.bajaUrl ?? null) : null,
  };
}
