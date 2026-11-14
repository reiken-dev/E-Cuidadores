import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EscenaCalendario, EscenaNota, EscenaPastilla } from './Escenas';

const ESCENAS = { EscenaPastilla, EscenaCalendario, EscenaNota };

describe('escenas del círculo (ilustraciones de los vacíos)', () => {
  for (const [nombre, Escena] of Object.entries(ESCENAS)) {
    it(`${nombre}: es decorativa, usa la grilla común y solo colores de tokens`, () => {
      const html = renderToStaticMarkup(<Escena />);
      expect(html).toContain('viewBox="0 0 240 160"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    });
  }
});
