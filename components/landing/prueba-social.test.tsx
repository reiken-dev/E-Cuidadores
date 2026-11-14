import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TESTIMONIOS } from '@/lib/prueba-social';
import { PruebaSocial } from './PruebaSocial';

describe('prueba social', () => {
  it('no aparece mientras no haya testimonios reales (la plantilla no inventa)', () => {
    expect(TESTIMONIOS).toHaveLength(0);
    expect(renderToStaticMarkup(<PruebaSocial />)).toBe('');
    expect(renderToStaticMarkup(<PruebaSocial testimonios={[]} />)).toBe('');
  });

  it('muestra cada testimonio con su frase, quién lo dice y su relación', () => {
    const html = renderToStaticMarkup(
      <PruebaSocial
        testimonios={[{ nombre: 'Ana', relacion: 'hija de una mamá de 81 años', frase: 'Ya no preguntamos quién le dio la pastilla.' }]}
      />
    );
    expect(html).toContain('Ana');
    expect(html).toContain('hija de una mamá de 81 años');
    expect(html).toContain('Ya no preguntamos quién le dio la pastilla.');
  });
});
