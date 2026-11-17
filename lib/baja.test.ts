import { describe, expect, it } from 'vitest';
import { firmarBaja, urlsDeBaja, verificarBaja } from './baja';

const SECRETO = 'un-secreto-de-prueba-largo-de-32-caracteres!!';
const OTRO = 'otro-secreto-de-prueba-largo-de-32-caracteres!!';
const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

describe('enlace de baja firmado (ECU-6)', () => {
  it('firma y verifica: devuelve el id de la persona', () => {
    const t = firmarBaja(U1, SECRETO)!;
    expect(t.startsWith(`${U1}.`)).toBe(true);
    expect(verificarBaja(t, SECRETO)).toBe(U1);
  });
  it('no se puede dar de baja a otra persona: cambiar el id, la firma o usar otro secreto falla', () => {
    const t = firmarBaja(U1, SECRETO)!;
    const firma = t.split('.')[1];
    expect(verificarBaja(`${U2}.${firma}`, SECRETO)).toBeNull();
    expect(verificarBaja(`${U1}.${firma.slice(0, -1)}A`, SECRETO)).toBeNull();
    expect(verificarBaja(t, OTRO)).toBeNull();
  });
  it('rechaza entradas raras sin lanzar', () => {
    for (const malo of [undefined, null, 42, '', '.', 'x.y', `${U1}`, `${U1}.`, `${U1}.a.b`, `no-es-uuid.${'a'.repeat(43)}`, 'a'.repeat(500)]) {
      expect(verificarBaja(malo, SECRETO)).toBeNull();
    }
  });
  it('sin un secreto de 32+ caracteres no firma ni verifica (falla cerrado)', () => {
    expect(firmarBaja(U1, undefined)).toBeNull();
    expect(firmarBaja(U1, 'corto')).toBeNull();
    const t = firmarBaja(U1, SECRETO)!;
    expect(verificarBaja(t, undefined)).toBeNull();
    expect(verificarBaja(t, 'corto')).toBeNull();
    expect(firmarBaja('no-es-uuid', SECRETO)).toBeNull();
  });
  it('urlsDeBaja arma la página y la ruta de un clic con el token dentro, sin datos de salud', () => {
    const u = urlsDeBaja(U1, SECRETO, 'https://ejemplo.com/')!;
    expect(u.pagina.startsWith('https://ejemplo.com/baja?t=')).toBe(true);
    expect(u.unClic.startsWith('https://ejemplo.com/api/baja?t=')).toBe(true);
    expect(urlsDeBaja(U1, undefined, 'https://ejemplo.com')).toBeNull();
  });
});
