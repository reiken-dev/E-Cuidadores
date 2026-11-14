import { describe, expect, it } from 'vitest';
import { CODIGO_CIRCULO_RE, codigoCirculoAleatorio } from './codigo-circulo';

/** Fuente de azar de prueba: rellena el arreglo con los bytes indicados. */
const fija = (valores: number[]) => ({
  getRandomValues: <T extends Uint8Array>(a: T): T => {
    a.set(valores);
    return a;
  },
});

describe('codigoCirculoAleatorio', () => {
  it('tiene dos grupos de cuatro caracteres con guion', () => {
    const c = codigoCirculoAleatorio(fija([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(c).toMatch(CODIGO_CIRCULO_RE);
    expect(c).toHaveLength(9);
    expect(c[4]).toBe('-');
  });
  it('usa el alfabeto sin 0, O, 1 ni I', () => {
    const c = codigoCirculoAleatorio(fija([255, 254, 253, 252, 251, 250, 249, 248]));
    expect(c).not.toMatch(/[01IO]/);
    expect(c).toMatch(CODIGO_CIRCULO_RE);
  });
  it('dos códigos seguidos son distintos (azar real)', () => {
    const codigos = new Set(Array.from({ length: 50 }, () => codigoCirculoAleatorio()));
    expect(codigos.size).toBe(50);
  });
  it('sale solo de los bytes de azar: con los mismos bytes, el mismo código', () => {
    // No mira el nombre ni ningún dato de la familia: solo el azar decide cada símbolo.
    expect(codigoCirculoAleatorio(fija([0, 0, 0, 0, 0, 0, 0, 0]))).toBe('AAAA-AAAA');
  });
});

describe('CODIGO_CIRCULO_RE', () => {
  it('acepta solo la forma XXXX-XXXX del alfabeto permitido', () => {
    expect(CODIGO_CIRCULO_RE.test('K7QD-3MPX')).toBe(true);
    expect(CODIGO_CIRCULO_RE.test('ROSA-4F9K')).toBe(false);
    expect(CODIGO_CIRCULO_RE.test('K7QD3MPX')).toBe(false);
    expect(CODIGO_CIRCULO_RE.test('K0QD-3MPX')).toBe(false);
  });
});
