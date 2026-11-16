// MARCA Y ENLACES — el primer archivo que edita quien adapta la plantilla.
// Aquí viven los datos que se repiten en toda la app (nombre, correo de soporte, URLs).
// Los textos de venta están en app/page.tsx; la oferta (precios, prueba, garantía) en lib/oferta.ts.

export const MARCA = {
  nombre: 'E-Cuidadores',
  /** Correo REAL que alguien lee: aparece en el pie, en los textos legales y en los avisos de error. */
  // EJEMPLO: correo@correo.com. DEBES cambiarlo por un correo tuyo que vayas a usar de verdad con esta app.
  soporteEmail: 'correo@correo.com',
  /** Dirección pública del sitio (se define en .env.local → NEXT_PUBLIC_SITE_URL). */
  sitioUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  /** Enlace de pago de Hotmart (NEXT_PUBLIC_HOTMART_CHECKOUT_URL). null = todavía no conectado. */
  checkoutUrl: process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_URL ?? null,
  /** Enlace del plan anual en Hotmart (NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL). null = no conectado. */
  checkoutAnualUrl: process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL ?? null,
  /** Panel de compras de Hotmart del cliente: aquí actualiza su medio de pago o cancela. */
  panelComprasUrl: process.env.NEXT_PUBLIC_HOTMART_PANEL_URL ?? null,
  /** Medios de pago que aceptas, en una frase (ej.: "Pagas con tarjeta de crédito o débito, PayPal, y en Brasil con Pix"). null = frase genérica. */
  mediosPago: (process.env.NEXT_PUBLIC_MEDIOS_PAGO ?? null) as string | null,
  /** Línea de pagos que se muestra en el pie y en el paywall (ej.: "Pagos procesados por Hotmart"). null = no se muestra nada. */
  notaPago: (process.env.NEXT_PUBLIC_NOTA_PAGO ?? null) as string | null,
  /** Cupón de regreso (win-back) que se ofrece a quien cancela. null = no hay. */
  cuponRegreso: process.env.NEXT_PUBLIC_CUPON_REGRESO ?? null,
  /**
   * Conexiones reales. Pon cada una en true SOLO cuando funcione de punta a punta (LISTA-DE-CONEXION.md, sección "Conexiones").
   * `npm run verificar` FALLA mientras supabase o hotmart estén en false (la app vende y tiene acceso protegido).
   * resend: en false, la app no envía correos y las pantallas no dicen que los envía.
   */
  conexiones: { supabase: false, hotmart: false, resend: true } as Conexiones,
} as const;

export interface Conexiones {
  supabase: boolean;
  hotmart: boolean;
  resend: boolean;
}

/** ¿Sigue el correo de ejemplo? Mientras sea true, el pie de la landing no muestra ningún correo: no publicamos un dato inventado. */
export const SOPORTE_EMAIL_DE_EJEMPLO = MARCA.soporteEmail === 'correo@correo.com';
