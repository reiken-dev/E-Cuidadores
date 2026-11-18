// DATOS LEGALES — el único lugar que edita quien publica su versión de la plantilla.
// Las páginas /privacidad, /terminos, /reembolsos, /cookies y /aviso-medico se arman desde aquí
// (textos en lib/legal-textos.ts). Mientras `pais` esté en null, las páginas usan fórmulas neutras
// ("la ley de tu país") y `npm run verificar` te avisa que falta completarlo. Los marcadores [COMPLETAR] de abajo
// bloquean la publicación hasta que los completes y los quites.
//
// Esto es un trabajo de completitud profesional, NO asesoría legal colegiada: antes de vender, haz que un
// abogado de tu país lo revise.

import { MARCA } from './marca';

export interface Proveedor {
  nombre: string;
  funcion: string;
  /** Dónde pueden estar sus servidores (transferencia internacional). */
  ubicacion: string;
}

export interface TextoLegal {
  titulo: string;
  intro: string;
  aviso?: { titulo: string; texto: string };
  secciones: LegalSection[];
}
export type LegalBlock = string | { list: string[] };
export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export const LEGAL = {
  /** Nombre completo o razón social de quien vende la app. Ej.: "Ana Pérez" o "Cuidado Familiar S.A.S.". */
  responsable: 'MILLION BUSINESS DIGITAL' as string | null,
  /** 'persona_natural' o 'empresa'. Solo cambia la fórmula con que se presenta el responsable. El titular ya fijado es una razón social: 'empresa'. */
  tipoResponsable: 'empresa' as 'persona_natural' | 'empresa',
  // [COMPLETAR: país desde el que operas (define la ley aplicable). Quita este marcador al poner el país en pais.]
  /** País desde el que operas (define la ley aplicable). Ej.: "Colombia". */
  pais: null as string | null,
  // [COMPLETAR: domicilio para notificaciones. Quita este marcador al ponerlo en domicilio.]
  // [COMPLETAR: identificador fiscal del titular (NIT, RUT, RFC u otro). La app no tiene campo para él: si tu país lo exige, añádelo a los textos legales.]
  /** Ciudad o domicilio para notificaciones (opcional pero recomendable). */
  domicilio: null as string | null,
  /** Correo para asuntos legales y de privacidad. Si es null se usa el de soporte. */
  emailLegal: null as string | null,
  /** Fecha visible en las páginas. Actualízala cada vez que cambies un texto y avisa a tus usuarios por correo. */
  actualizado: '10 de octubre de 2026',
  /** Versión del texto (para registrar qué versión aceptó cada persona al conectar tu base de datos). */
  version: '2026-10-10',
  /** ¿La app envía datos a un servicio de inteligencia artificial? La plantilla NO lo hace. Si lo agregas, ponlo en true y completa el proveedor. */
  usaIA: false,
  /** ¿Cargas analítica o publicidad que NO sea esencial? Si pones true, aparece el aviso de cookies y nada se mide antes de aceptar. */
  analiticaNoEsencial: false,
  /** Terceros que tratan datos por ti. Edita esta lista para que sea idéntica a lo que realmente usas. */
  proveedores: [
    { nombre: 'Supabase', funcion: 'base de datos y cuentas de acceso', ubicacion: 'según la región que elijas al crear el proyecto' },
    { nombre: 'Vercel', funcion: 'alojamiento del sitio y la aplicación', ubicacion: 'Estados Unidos y otras regiones de su red' },
    { nombre: 'Resend', funcion: 'envío de correos (acceso, avisos y recordatorios)', ubicacion: 'Estados Unidos' },
    { nombre: 'Hotmart', funcion: 'cobro de la suscripción, comprobantes y reembolsos', ubicacion: 'según tu país de compra' },
  ] as Proveedor[],
} as const;

export const emailLegal = LEGAL.emailLegal ?? MARCA.soporteEmail;

/** "E-Cuidadores, operado por Ana Pérez" o, sin datos, "el equipo de E-Cuidadores". */
export const quienSomos = LEGAL.responsable
  ? `${MARCA.nombre}, operado por ${LEGAL.responsable}${LEGAL.tipoResponsable === 'persona_natural' ? ' (persona natural)' : ''}`
  : `el equipo de ${MARCA.nombre}`;

/** "las leyes de Colombia" o, sin país, "las leyes del país desde el que se presta el servicio". */
export const leyAplicable = LEGAL.pais ? `las leyes de ${LEGAL.pais}` : 'las leyes del país desde el que se presta el servicio';

export const datosLegalesCompletos = Boolean(LEGAL.responsable && LEGAL.pais);

/** Clave de las preferencias de cookies (solo guarda "aceptó/rechazó" la medición; nunca el consentimiento de registro). */
export const COOKIES_KEY = 'entre-hermanos:cookies:v1';

/**
 * Los textos legales se COMPROMETEN a tres cosas que la plantilla deja listas solo como ejemplo:
 *  1) enlace de baja funcional en los correos de retención (ruta /baja; hecho en ECU-6: lib/baja.ts, app/baja y supabase/cron-retencion.sql),
 *  2) aviso por correo antes de la renovación anual (secuencia D de docs/retencion/CORREOS.md),
 *  3) cierre de cuenta y borrado de datos en el servidor (hoy, por correo en 15 días hábiles).
 * Ponla en true SOLO cuando las tres funcionen. `npm run verificar` te lo recuerda.
 */
export const COMPROMISOS_LEGALES_CUMPLIDOS = false;
