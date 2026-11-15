import { describe, expect, it } from 'vitest';
import { normalizarCodigo, rutaUnirme } from './invitacion';

describe('invitación por enlace', () => {
  it('normaliza el código a mayúsculas y sin espacios', () => {
    expect(normalizarCodigo(' k7qd-3mpx ')).toBe('K7QD-3MPX');
  });
  it('rechaza lo que no tiene la forma válida (o confunde 0, O, 1, I)', () => {
    for (const malo of ['', 'K7QD3MPX', 'K7QD-3MP', 'K7QD-3MP0', 'K7QD-3MPI', '../app', 'K7QD-3MPX/..', null, undefined, 42]) {
      expect(normalizarCodigo(malo)).toBeNull();
    }
  });
  it('la ruta es interna y solo lleva el código', () => {
    expect(rutaUnirme('K7QD-3MPX')).toBe('/unirme/K7QD-3MPX');
  });
});
