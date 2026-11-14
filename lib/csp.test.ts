import { describe, expect, it } from 'vitest';
import { construirCsp, origenDeSupabase } from './csp';

const URL_SUPABASE = 'https://abcdefgh.supabase.co';
const directiva = (csp: string, nombre: string) => csp.split('; ').find((d) => d.startsWith(`${nombre} `));

describe('origenDeSupabase', () => {
  it('devuelve solo el origen, sin ruta', () => {
    expect(origenDeSupabase('https://abcdefgh.supabase.co/rest/v1/')).toBe(URL_SUPABASE);
    expect(origenDeSupabase('  https://abcdefgh.supabase.co  ')).toBe(URL_SUPABASE);
  });
  it('descarta usuario y clave de la URL', () => {
    expect(origenDeSupabase('https://usuario:clave@abcdefgh.supabase.co/x')).toBe(URL_SUPABASE);
  });
  it('rechaza comodines, aunque la URL sea sintácticamente válida', () => {
    expect(origenDeSupabase('https://*.supabase.co')).toBeNull();
    expect(origenDeSupabase('https://*')).toBeNull();
  });
  it('rechaza un host que pueda colar otra directiva', () => {
    expect(origenDeSupabase('https://a.co;script-src')).toBeNull();
    expect(origenDeSupabase("https://a.co'")).toBeNull();
  });
  it('en producción exige https; en desarrollo acepta http', () => {
    expect(origenDeSupabase('http://localhost:54321')).toBeNull();
    expect(origenDeSupabase('http://localhost:54321', true)).toBe('http://localhost:54321');
    expect(origenDeSupabase('http://abcdefgh.supabase.co', false)).toBeNull();
  });
  it('ignora lo ausente o inválido', () => {
    expect(origenDeSupabase(undefined)).toBeNull();
    expect(origenDeSupabase(null)).toBeNull();
    expect(origenDeSupabase('')).toBeNull();
    expect(origenDeSupabase('no es una url')).toBeNull();
    expect(origenDeSupabase('javascript:alert(1)')).toBeNull();
    expect(origenDeSupabase('ftp://x.supabase.co')).toBeNull();
  });
});

describe('construirCsp', () => {
  it('sin URL de Supabase, connect-src queda solo en self', () => {
    expect(directiva(construirCsp({ dev: false }), 'connect-src')).toBe("connect-src 'self'");
    expect(directiva(construirCsp({ dev: false, supabaseUrl: 'basura' }), 'connect-src')).toBe("connect-src 'self'");
  });
  it('con URL de Supabase, abre exactamente ese origen', () => {
    expect(directiva(construirCsp({ dev: false, supabaseUrl: URL_SUPABASE }), 'connect-src')).toBe(`connect-src 'self' ${URL_SUPABASE}`);
  });
  it('una variable mal puesta no ensancha ni rompe la política', () => {
    for (const mala of ['https://*.supabase.co', 'https://*', 'https://a.co;script-src', 'http://abcdefgh.supabase.co']) {
      const csp = construirCsp({ dev: false, supabaseUrl: mala });
      expect(directiva(csp, 'connect-src')).toBe("connect-src 'self'");
      expect(csp).toBe(construirCsp({ dev: false }));
    }
  });
  it('la política de producción es exactamente la de siempre, más el origen de Supabase', () => {
    expect(construirCsp({ dev: false, supabaseUrl: URL_SUPABASE })).toBe(
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        `connect-src 'self' ${URL_SUPABASE}`,
        "manifest-src 'self'",
        "worker-src 'self' blob:",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
      ].join('; ')
    );
  });
  it('nunca usa comodines', () => {
    expect(construirCsp({ dev: false, supabaseUrl: URL_SUPABASE })).not.toMatch(/\*/);
    expect(construirCsp({ dev: true, supabaseUrl: URL_SUPABASE })).not.toMatch(/\*/);
  });
  it('en desarrollo conserva ws/wss y unsafe-eval; en producción no', () => {
    const dev = construirCsp({ dev: true, supabaseUrl: URL_SUPABASE });
    expect(directiva(dev, 'connect-src')).toBe(`connect-src 'self' ${URL_SUPABASE} ws: wss:`);
    expect(dev).toContain("'unsafe-eval'");
    const prod = construirCsp({ dev: false, supabaseUrl: URL_SUPABASE });
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain('ws:');
    expect(prod).toContain('upgrade-insecure-requests');
  });
  it('el resto de la política no cambia por abrir Supabase', () => {
    const quitar = (csp: string) => csp.split('; ').filter((d) => !d.startsWith('connect-src')).join('; ');
    expect(quitar(construirCsp({ dev: false, supabaseUrl: URL_SUPABASE }))).toBe(quitar(construirCsp({ dev: false })));
  });
  it('mantiene las directivas que cierran frames, objetos y formularios externos', () => {
    const csp = construirCsp({ dev: false, supabaseUrl: URL_SUPABASE });
    for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
      expect(csp).toContain(d);
    }
  });
});
