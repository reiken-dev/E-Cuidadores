// LANDING — FOOTER LEGAL
// 2 filas máximo: enlaces legales arriba, copyright + soporte abajo. Jerarquía
// terciaria total: cero acento, cero botones — el footer NUNCA compite con el
// CTA final. Cada enlace con área táctil ≥44px. REGLA DURA: todos los
// enlaces apuntan a páginas que EXISTEN (contenido con 47) — la landing no está
// lista con enlaces muertos. El contraste del texto terciario debe medir ≥4.5:1
// sobre --bg (se verifica al tematizar tokens.css).
// Server component: sin hooks ni motion — no necesita 'use client'.

import type { ReactNode } from 'react';
import { BrandMark } from './primitives';

export interface EnlaceLegal {
  label: string;
  /** Página EXISTENTE — nunca "#" ni rutas muertas. */
  href: string;
}

export interface FooterLegalProps {
  appName: string;
  logo?: ReactNode;
  /** Privacidad · Términos · Reembolsos · Aviso de IA (si aplica) — con 47. */
  enlaces: EnlaceLegal[];
  /** Email REAL que alguien lee. Sin valor (undefined) el pie no muestra correo. */
  soporteEmail?: string;
  anio?: number;
  /** Línea legal de pagos (aquí sí va el nombre del procesador, nunca en texto de venta). */
  notaPago?: string;
}

export function FooterLegal({ appName, logo, enlaces, soporteEmail, anio, notaPago }: FooterLegalProps) {
  const year = anio ?? new Date().getFullYear();
  return (
    <footer className="linea-grad-top relative py-8 md:py-12">
      <div className="mx-auto w-full max-w-[1140px] px-5">
        {/* Fila 1: marca chica + enlaces legales */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-[16px] font-semibold text-[var(--text-secondary)]">
            {logo ?? <BrandMark size={20} />}
            {appName}
          </p>
          <nav aria-label="Enlaces legales">
            {/* Sin separadores de texto: al saltar de línea no queda ningún "·" huérfano */}
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-0">
              {enlaces.map((e) => (
                <li key={e.href}>
                  {/* py-3 = área táctil ≥44px sin líneas pegadas */}
                  <a href={e.href}
                    className="inline-flex py-3 text-[16px] text-[var(--text-tertiary)] underline-offset-4 hover:text-[var(--text-secondary)] hover:underline"
                  >
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Fila 2: copyright, soporte y nota de pagos, cada uno en su propia línea corta */}
        <div className="mt-3 flex flex-col gap-1 text-[16px] text-[var(--text-tertiary)]">
          <p>
            © {year} {appName}
          </p>
          {soporteEmail && (
            <a href={`mailto:${soporteEmail}`} className="inline-flex min-h-11 w-fit items-center underline-offset-4 hover:underline">
              {soporteEmail}
            </a>
          )}
          {notaPago && <p>{notaPago}</p>}
        </div>
      </div>
    </footer>
  );
}
