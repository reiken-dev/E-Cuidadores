import { describe, expect, it } from 'vitest';
import { rutaSegura } from './ruta-segura';

describe('rutaSegura', () => {
  it('acepta rutas internas', () => {
    expect(rutaSegura('/app')).toBe('/app');
    expect(rutaSegura('/app/medicinas?x=1')).toBe('/app/medicinas?x=1');
  });
  it('sin destino usa /app', () => {
    expect(rutaSegura(null)).toBe('/app');
    expect(rutaSegura(undefined)).toBe('/app');
    expect(rutaSegura('')).toBe('/app');
  });
  it('rechaza destinos externos', () => {
    expect(rutaSegura('https://evil.com')).toBe('/app');
    expect(rutaSegura('//evil.com')).toBe('/app');
    expect(rutaSegura('/\\evil.com')).toBe('/app');
    expect(rutaSegura('app')).toBe('/app');
    expect(rutaSegura('javascript:alert(1)')).toBe('/app');
  });
  it('rechaza caracteres de control', () => {
    expect(rutaSegura('/app\r\nSet-Cookie: x=1')).toBe('/app');
  });
});
