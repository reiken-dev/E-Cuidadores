import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const marca = vi.hoisted(() => ({ conexiones: { supabase: true } }));
vi.mock('@/lib/marca', () => ({ MARCA: marca }));
const crearClienteServidor = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servidor', () => ({ crearClienteServidor: () => crearClienteServidor() }));
const { registrarConsentimientos, tieneConsentimientos } = vi.hoisted(() => ({ registrarConsentimientos: vi.fn(), tieneConsentimientos: vi.fn() }));
vi.mock('@/lib/alta', () => ({
  registrarConsentimientos: (...a: unknown[]) => registrarConsentimientos(...a),
  tieneConsentimientos: (...a: unknown[]) => tieneConsentimientos(...a),
}));

import { GET } from './route';

const ORIGEN = 'https://app.test';
const pedir = (ruta: string) => GET(new NextRequest(`${ORIGEN}${ruta}`));
const destino = (r: Response) => r.headers.get('location');

function db(opciones: { exchange?: unknown; verify?: unknown; user?: unknown } = {}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: opciones.exchange ?? null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: opciones.verify ?? null }),
      getUser: vi.fn().mockResolvedValue(
        opciones.user === null ? { data: { user: null }, error: { message: 'x' } } : { data: { user: { id: 'u1' } }, error: null }
      ),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    marca.conexiones.supabase = true;
    crearClienteServidor.mockReset();
    registrarConsentimientos.mockReset().mockResolvedValue({ ok: true, guardados: true });
    tieneConsentimientos.mockReset().mockResolvedValue(true);
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('con Supabase desconectado no hace nada y va a /entrar', async () => {
    marca.conexiones.supabase = false;
    expect(destino(await pedir('/auth/callback?code=abc'))).toBe(`${ORIGEN}/entrar?error=acceso`);
    expect(crearClienteServidor).not.toHaveBeenCalled();
  });
  it('sin cliente (faltan variables) va a /entrar', async () => {
    crearClienteServidor.mockResolvedValue(null);
    expect(destino(await pedir('/auth/callback'))).toBe(`${ORIGEN}/entrar?error=acceso`);
  });
  it('con token_hash verifica el código en el servidor (sirve en cualquier navegador) y sigue a la ruta pedida', async () => {
    const cliente = db();
    crearClienteServidor.mockResolvedValue(cliente);
    expect(destino(await pedir('/auth/callback?next=/unirme/K7QD-3MPX&token_hash=abc123&type=email'))).toBe(`${ORIGEN}/unirme/K7QD-3MPX`);
    expect(cliente.auth.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'abc123' });
    expect(cliente.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it('token_hash inválido, vencido, ya usado o con un type que no aceptamos va a /entrar sin abrir sesión', async () => {
    const cliente = db({ verify: { message: 'expired' } });
    crearClienteServidor.mockResolvedValue(cliente);
    expect(destino(await pedir('/auth/callback?token_hash=abc&type=email'))).toBe(`${ORIGEN}/entrar?error=acceso`);
    for (const tipo of ['', 'admin', 'invite', 'sms', '../x']) {
      crearClienteServidor.mockResolvedValue(db());
      expect(destino(await pedir(`/auth/callback?token_hash=abc&type=${tipo}`))).toBe(`${ORIGEN}/entrar?error=acceso`);
    }
    expect(destino(await pedir('/auth/callback?token_hash=abc'))).toBe(`${ORIGEN}/entrar?error=acceso`);
    expect(destino(await pedir(`/auth/callback?token_hash=${'a'.repeat(300)}&type=email`))).toBe(`${ORIGEN}/entrar?error=acceso`);
  });
  it('con token_hash y sin los dos consentimientos va a /aceptar conservando el destino', async () => {
    crearClienteServidor.mockResolvedValue(db());
    tieneConsentimientos.mockResolvedValue(false);
    expect(destino(await pedir('/auth/callback?next=/unirme/K7QD-3MPX&token_hash=abc&type=email'))).toBe(`${ORIGEN}/aceptar?next=%2Funirme%2FK7QD-3MPX`);
  });
  it('código inválido va a /entrar', async () => {
    crearClienteServidor.mockResolvedValue(db({ exchange: { message: 'bad' } }));
    expect(destino(await pedir('/auth/callback?code=mal'))).toBe(`${ORIGEN}/entrar?error=acceso`);
  });
  it('sin usuario validado va a /entrar', async () => {
    crearClienteServidor.mockResolvedValue(db({ user: null }));
    expect(destino(await pedir('/auth/callback'))).toBe(`${ORIGEN}/entrar?error=acceso`);
  });
  it('con una casilla sin marcar en el metadata, va a /aceptar y conserva la sesión', async () => {
    const cliente = db();
    crearClienteServidor.mockResolvedValue(cliente);
    registrarConsentimientos.mockResolvedValue({ ok: false, error: 'faltan consentimientos', incompletos: true });
    expect(destino(await pedir('/auth/callback?code=abc'))).toBe(`${ORIGEN}/aceptar`);
    expect(cliente.auth.signOut).not.toHaveBeenCalled();
  });
  it('si el registro de consentimientos falla al guardar, cierra la sesión', async () => {
    const cliente = db();
    crearClienteServidor.mockResolvedValue(cliente);
    registrarConsentimientos.mockResolvedValue({ ok: false, error: 'x' });
    expect(destino(await pedir('/auth/callback?code=abc'))).toBe(`${ORIGEN}/entrar?error=consentimientos`);
    expect(cliente.auth.signOut).toHaveBeenCalled();
  });
  it('sin los dos consentimientos guardados va a /aceptar, no a /app', async () => {
    crearClienteServidor.mockResolvedValue(db());
    tieneConsentimientos.mockResolvedValue(false);
    expect(destino(await pedir('/auth/callback?code=abc&next=/app'))).toBe(`${ORIGEN}/aceptar`);
  });
  it('sin consentimientos conserva el destino al pasar por /aceptar (enlace de un hermano)', async () => {
    crearClienteServidor.mockResolvedValue(db());
    tieneConsentimientos.mockResolvedValue(false);
    expect(destino(await pedir('/auth/callback?code=abc&next=/unirme/K7QD-3MPX'))).toBe(`${ORIGEN}/aceptar?next=%2Funirme%2FK7QD-3MPX`);
    expect(destino(await pedir('/auth/callback?code=abc&next=//evil.com'))).toBe(`${ORIGEN}/aceptar`);
  });
  it('con todo en orden va a /app (o a la ruta interna pedida)', async () => {
    crearClienteServidor.mockResolvedValue(db());
    expect(destino(await pedir('/auth/callback?code=abc'))).toBe(`${ORIGEN}/app`);
    expect(destino(await pedir('/auth/callback?code=abc&next=/app/citas'))).toBe(`${ORIGEN}/app/citas`);
  });
  it('un next externo no sale del sitio', async () => {
    crearClienteServidor.mockResolvedValue(db());
    expect(destino(await pedir('/auth/callback?code=abc&next=//evil.com'))).toBe(`${ORIGEN}/app`);
    expect(destino(await pedir('/auth/callback?code=abc&next=https://evil.com'))).toBe(`${ORIGEN}/app`);
  });
  it('con NEXT_PUBLIC_SITE_URL mal escrita no se cae: usa el origen de la petición', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'esto no es una url';
    crearClienteServidor.mockResolvedValue(db());
    expect(destino(await pedir('/auth/callback?code=abc'))).toBe(`${ORIGEN}/app`);
  });
  it('prefiere NEXT_PUBLIC_SITE_URL al host de la petición', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://publico.test/ruta';
    crearClienteServidor.mockResolvedValue(db());
    expect(destino(await pedir('/auth/callback?code=abc'))).toBe('https://publico.test/app');
  });
});
