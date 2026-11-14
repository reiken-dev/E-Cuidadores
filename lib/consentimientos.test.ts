import { describe, expect, it } from 'vitest';
import { filasDeAlta } from './consentimientos';
import { LEGAL } from './legal';

describe('consentimientos al crear la cuenta', () => {
  it('sin las dos casillas no hay alta', () => {
    expect(filasDeAlta('u1', { terminos: true, salud: false })).toBeNull();
    expect(filasDeAlta('u1', { terminos: false, salud: true })).toBeNull();
  });
  it('con las dos casillas, una fila por finalidad y con la versión del texto', () => {
    const filas = filasDeAlta('u1', { terminos: true, salud: true });
    expect(filas).toEqual([
      { user_id: 'u1', purpose: 'terms_privacy_adult', text_version: LEGAL.version, locale: 'es', origin: 'signup' },
      { user_id: 'u1', purpose: 'health_data', text_version: LEGAL.version, locale: 'es', origin: 'signup' },
    ]);
  });
});
