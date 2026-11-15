// Redirecciones de /app y /aceptar según sesión y consentimientos. redirect() lanza en Next: aquí lanza el destino.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const marca = vi.hoisted(() => ({ nombre: 'E-Cuidadores', conexiones: { supabase: true } }));
vi.mock('@/lib/marca', () => ({ MARCA: marca }));
vi.mock('next/navigation', () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));
vi.mock('@/components/app/AppShell', () => ({ AppShell: () => null }));
vi.mock('@/app/app/tokens-app.css', () => ({}));
vi.mock('./aceptar/AceptarForm', () => ({ default: () => null }));
vi.mock('./bienvenida/BienvenidaForm', () => ({ default: () => null }));
const s = vi.hoisted(() => ({ sesionDelServidor: vi.fn(), consentimientosAlDia: vi.fn(), tieneCirculo: vi.fn(), demo: vi.fn() }));
vi.mock('@/lib/sesion', () => ({
  sesionDelServidor: () => s.sesionDelServidor(),
  consentimientosAlDia: () => s.consentimientosAlDia(),
  tieneCirculo: () => s.tieneCirculo(),
  appEnDemostracion: () => s.demo(),
}));

import AppLayout from './app/layout';
import AceptarPage from './aceptar/page';
import BienvenidaPage from './bienvenida/page';

const destinoDe = async (f: () => Promise<unknown>) => {
  try {
    await f();
    return 'SIN-REDIRECT';
  } catch (e) {
    return (e as Error).message.replace('REDIRECT:', '');
  }
};

describe('guard de /app', () => {
  beforeEach(() => {
    s.demo.mockReset().mockReturnValue(false);
    s.sesionDelServidor.mockReset().mockResolvedValue({ userId: 'u1' });
    s.consentimientosAlDia.mockReset().mockResolvedValue(true);
    s.tieneCirculo.mockReset().mockResolvedValue(true);
  });

  it('en demostración no consulta sesión ni consentimientos', async () => {
    s.demo.mockReturnValue(true);
    expect(await destinoDe(() => AppLayout({ children: null }))).toBe('SIN-REDIRECT');
    expect(s.sesionDelServidor).not.toHaveBeenCalled();
  });
  it('sin sesión va a /entrar', async () => {
    s.sesionDelServidor.mockResolvedValue(null);
    expect(await destinoDe(() => AppLayout({ children: null }))).toBe('/entrar');
  });
  it('con sesión pero sin consentimientos va a /aceptar', async () => {
    s.consentimientosAlDia.mockResolvedValue(false);
    expect(await destinoDe(() => AppLayout({ children: null }))).toBe('/aceptar');
  });
  it('con sesión y consentimientos pero sin círculo va a /bienvenida', async () => {
    s.tieneCirculo.mockResolvedValue(false);
    expect(await destinoDe(() => AppLayout({ children: null }))).toBe('/bienvenida');
  });
  it('si no se pudo comprobar el círculo, entra: la app muestra su propio error en vez de mandar a crear otro', async () => {
    s.tieneCirculo.mockResolvedValue(null);
    expect(await destinoDe(() => AppLayout({ children: null }))).toBe('SIN-REDIRECT');
  });
  it('con sesión, consentimientos y círculo entra', async () => {
    expect(await destinoDe(() => AppLayout({ children: null }))).toBe('SIN-REDIRECT');
  });
});

describe('página /aceptar', () => {
  beforeEach(() => {
    marca.conexiones.supabase = true;
    s.sesionDelServidor.mockReset().mockResolvedValue({ userId: 'u1' });
    s.consentimientosAlDia.mockReset().mockResolvedValue(false);
  });

  it('con Supabase desconectado va a /entrar', async () => {
    marca.conexiones.supabase = false;
    expect(await destinoDe(() => AceptarPage())).toBe('/entrar');
  });
  it('sin sesión va a /entrar', async () => {
    s.sesionDelServidor.mockResolvedValue(null);
    expect(await destinoDe(() => AceptarPage())).toBe('/entrar');
  });
  it('si ya tiene los consentimientos va a /app (no hay bucle)', async () => {
    s.consentimientosAlDia.mockResolvedValue(true);
    expect(await destinoDe(() => AceptarPage())).toBe('/app');
  });
  it('con sesión y sin consentimientos muestra el formulario', async () => {
    expect(await destinoDe(() => AceptarPage())).toBe('SIN-REDIRECT');
  });
});

describe('página /bienvenida', () => {
  beforeEach(() => {
    marca.conexiones.supabase = true;
    s.sesionDelServidor.mockReset().mockResolvedValue({ userId: 'u1' });
    s.consentimientosAlDia.mockReset().mockResolvedValue(true);
    s.tieneCirculo.mockReset().mockResolvedValue(false);
  });

  it('con Supabase desconectado va a /entrar', async () => {
    marca.conexiones.supabase = false;
    expect(await destinoDe(() => BienvenidaPage())).toBe('/entrar');
  });
  it('sin sesión va a /entrar y sin consentimientos a /aceptar', async () => {
    s.sesionDelServidor.mockResolvedValue(null);
    expect(await destinoDe(() => BienvenidaPage())).toBe('/entrar');
    s.sesionDelServidor.mockResolvedValue({ userId: 'u1' });
    s.consentimientosAlDia.mockResolvedValue(false);
    expect(await destinoDe(() => BienvenidaPage())).toBe('/aceptar');
  });
  it('si ya tiene círculo, o no se pudo comprobar, va a /app (no hay bucle ni se crea un segundo círculo)', async () => {
    s.tieneCirculo.mockResolvedValue(true);
    expect(await destinoDe(() => BienvenidaPage())).toBe('/app');
    s.tieneCirculo.mockResolvedValue(null);
    expect(await destinoDe(() => BienvenidaPage())).toBe('/app');
  });
  it('sin círculo muestra el formulario', async () => {
    expect(await destinoDe(() => BienvenidaPage())).toBe('SIN-REDIRECT');
  });
});
