import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BORRADOR_KEY, borrarBorrador, guardarBorrador, leerBorrador } from './borrador';

class FakeStorage {
  map = new Map<string, string>();
  bloqueado = false;
  getItem(k: string) {
    if (this.bloqueado) throw new DOMException('bloqueado', 'SecurityError');
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.bloqueado) throw new DOMException('sin espacio', 'QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}
let storage: FakeStorage;
beforeEach(() => {
  storage = new FakeStorage();
  vi.stubGlobal('window', { localStorage: storage });
});
afterEach(() => vi.unstubAllGlobals());

const borrador = { nombreFamiliar: 'Rosa', parentesco: 'Mamá', tuNombre: 'Ana', medicina: 'Losartán', hora: '20:00' };

describe('borrador del primer círculo', () => {
  it('se guarda, se lee y se borra', () => {
    guardarBorrador(borrador);
    expect(leerBorrador()).toEqual(borrador);
    borrarBorrador();
    expect(leerBorrador()).toBeNull();
    expect(storage.map.has(BORRADOR_KEY)).toBe(false);
  });
  it('sin nada guardado devuelve null', () => {
    expect(leerBorrador()).toBeNull();
  });
  it('lo dañado no rompe: texto que no es JSON o con campos raros', () => {
    storage.map.set(BORRADOR_KEY, 'no es json');
    expect(leerBorrador()).toBeNull();
    storage.map.set(BORRADOR_KEY, JSON.stringify({ nombreFamiliar: 5, hora: '25:99', medicina: 'x'.repeat(500) }));
    expect(leerBorrador()).toEqual({ nombreFamiliar: '', parentesco: '', tuNombre: '', medicina: 'x'.repeat(80), hora: '08:00' });
  });
  it('con el almacenamiento bloqueado no lanza', () => {
    storage.bloqueado = true;
    expect(() => guardarBorrador(borrador)).not.toThrow();
    expect(leerBorrador()).toBeNull();
    expect(() => borrarBorrador()).not.toThrow();
  });
});
