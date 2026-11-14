import { GARANTIA_DIAS, OFERTA_ES_EJEMPLO, PRECIOS_DE_EJEMPLO, TRIAL_DIAS, tieneTrial } from '@/lib/oferta';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LandingPage from '@/app/page';
import { Circulo } from '@/components/brand/Circulo';
import { HeroCaptura } from './HeroCaptura';
import { Check, ChevronDown, Lock } from './icons';

const html = renderToStaticMarkup(<LandingPage />);
const texto = html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&quot;|&amp;/g, ' ').replace(/\s+/g, ' ');

describe('landing — contenido', () => {
  it('lleva la gran idea y el mecanismo bautizado', () => {
    expect(texto).toContain('Que nadie más pregunte');
    expect(texto).toContain('Dosis con nombre');
    expect(texto).toContain('Círculo de Cuidado');
  });
  it('no promete nada que la plantilla no hace (B2, B3, B5)', () => {
    for (const prohibido of ['1 toque', 'desde tu cuenta', 'Ya le avisamos', 'te avisamos', 'OXXO', 'PIX', 'cuotas']) {
      expect(texto, `aparece "${prohibido}"`).not.toContain(prohibido);
    }
  });
  it('tiene un solo h1 y el CTA único apunta al recorrido', () => {
    expect(html.match(/<h1/g)?.length).toBe(1);
    expect(html).toContain('href="/onboarding"');
  });
  it('la prueba y la garantía salen de lib/oferta (sin cifras sueltas)', () => {
    expect(texto).toContain(`${GARANTIA_DIAS} días`);
    if (tieneTrial) expect(texto).toContain(`${TRIAL_DIAS} días`);
    else expect(texto).not.toMatch(/\bprueba|días gratis|Primer cobro el día|Precio de referencia/i);
  });
  it('no hay imágenes sin texto alternativo', () => {
    const imgs = html.match(/<img[^>]*>/g) ?? [];
    for (const i of imgs) expect(i).toMatch(/alt="[^"]+"/);
  });
  it('el FAQ es nativo (details/summary) y no depende de JavaScript', () => {
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
  });
});

describe('landing — promesas, cabecera y textos', () => {
  it('tiene una sola cabecera en el DOM (la fija de arriba)', () => {
    expect(html.match(/<header/g)?.length).toBe(1);
  });
  it('no promete tiempo ni minutos sin medir', () => {
    expect(texto).not.toMatch(/poco tiempo|dos minutos|en poco tiempo/i);
  });
  it('la oferta visible no marca "Ejemplo" delante de precios, prueba ni garantía (la marca vive en lib/oferta.ts)', () => {
    expect(texto).not.toContain('Ejemplo: ');
    expect(texto).not.toContain('Precio de ejemplo');
    expect(texto).toContain(`Garantía de ${GARANTIA_DIAS} días`);
    expect(OFERTA_ES_EJEMPLO).toBe(PRECIOS_DE_EJEMPLO);
  });
  it('toda mención de garantía dice «Garantía de 7 días» y ninguna otra duración', () => {
    const menciones = texto.match(/[Gg]arantía[^.:,;]{0,40}/g) ?? [];
    expect(menciones.length).toBeGreaterThan(0);
    for (const m of menciones) expect(m, m).toMatch(new RegExp(`^[Gg]arantía de ${GARANTIA_DIAS} días`));
  });
  it('cada CTA de la landing tiene un id estable y data-evento; los de compra llevan "inicio-compra"', () => {
    for (const id of ['cta-hero', 'cta-anual', 'cta-mensual', 'cta-final', 'cta-barra-fija']) {
      expect(html, `falta id="${id}"`).toContain(`id="${id}"`);
    }
    const compra = html.match(/<a[^>]*data-evento="inicio-compra"[^>]*>/g) ?? [];
    expect(compra.length).toBeGreaterThanOrEqual(4);
    for (const a of compra) expect(a).toMatch(/id="cta-[a-z-]+"/);
  });
  it('la FAQ no promete cancelar desde la app: indica el panel de compras', () => {
    expect(texto).not.toContain('Cancelas desde');
    expect(texto).toContain('panel de compras');
  });
});

describe('identidad — componentes de servidor', () => {
  it('el Círculo dibuja un svg con las cinco personas', () => {
    const svg = renderToStaticMarkup(<Circulo size={200} etiqueta="Círculo de cuidado" />);
    expect(svg).toContain('<svg');
    for (const letra of ['C', 'M', 'A', 'L', 'R']) expect(svg).toContain(`>${letra}</text>`);
    expect(svg).toContain('aria-label="Círculo de cuidado"');
  });
  it('el Círculo decorativo se oculta a lectores de pantalla', () => {
    expect(renderToStaticMarkup(<Circulo simple />)).toContain('aria-hidden="true"');
  });
  it('la captura del hero es la pantalla principal real, con alt y dimensiones fijas (CLS 0)', () => {
    const h = renderToStaticMarkup(<HeroCaptura nombreApp="E-Cuidadores" />);
    expect(h).toContain('alt="Pantalla principal de la app E-Cuidadores"');
    expect(h).toContain('width="780"');
    expect(h).toContain('height="980"');
    expect(h).toContain('src="/hero/entre-hermanos-hoy.webp"');
    expect(h).toMatch(/<img[^>]*fetch[pP]riority="high"/);
  });
  it('la firma del hero tiene la píldora y los tres avatares decorativos, ocultos a lectores de pantalla', () => {
    const h = renderToStaticMarkup(<HeroCaptura nombreApp="E-Cuidadores" />);
    expect(h).toContain('Te toca a ti');
    expect(h.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(5);
  });
  it('la captura no muestra avisos de demostración ni de ejemplo en su texto alternativo', () => {
    const h = renderToStaticMarkup(<HeroCaptura nombreApp="E-Cuidadores" />);
    expect(h).not.toMatch(/alt="[^"]*(ejemplo|demostración)/i);
  });
  it('los íconos propios renderizan svg con trazo', () => {
    for (const I of [Check, ChevronDown, Lock]) expect(renderToStaticMarkup(<I size={16} />)).toContain('stroke="currentColor"');
  });
});
