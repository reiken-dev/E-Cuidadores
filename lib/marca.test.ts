import { describe, expect, it } from 'vitest';
import { MARCA } from './marca';

describe('marca', () => {
  it('tiene nombre y un correo de soporte válido o marcado como pendiente', () => {
    expect(MARCA.nombre.length).toBeGreaterThan(1);
    expect(MARCA.soporteEmail).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$|^\[COMPLETAR: [^\]]+\]$/);
  });
  it('el checkout no está conectado en la plantilla', () => {
    expect(MARCA.checkoutUrl).toBeNull();
  });
});
