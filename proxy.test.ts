import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const marca = vi.hoisted(() => ({ conexiones: { supabase: true } }));
vi.mock('@/lib/marca', () => ({ MARCA: marca }));
type Opciones = { cookies: { setAll: (l: { name: string; value: string; options: object }[], h?: Record<string, string>) => void } };
const { getUser, createServerClient, estado } = vi.hoisted(() => {
  const getUser = vi.fn();
  const estado = { opciones: undefined as unknown as Opciones };
  const createServerClient = vi.fn((_u: string, _k: string, o: Opciones) => {
    estado.opciones = o;
    return { auth: { getUser } };
  });
  return { getUser, createServerClient, estado };
});
vi.mock('@supabase/ssr', () => ({ createServerClient }));

import { proxy } from './proxy';

const peticion = () => new NextRequest('https://app.test/app');

describe('proxy', () => {
  beforeEach(() => {
    marca.conexiones.supabase = true;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    createServerClient.mockClear();
  });

  it('con Supabase desconectado no crea cliente ni consulta nada', async () => {
    marca.conexiones.supabase = false;
    await proxy(peticion());
    expect(createServerClient).not.toHaveBeenCalled();
  });
  it('sin variables de entorno pasa sin hacer nada', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await proxy(peticion());
    expect(createServerClient).not.toHaveBeenCalled();
  });
  it('si Supabase no responde, la página sigue cargando', async () => {
    getUser.mockRejectedValue(new Error('red caída'));
    const r = await proxy(peticion());
    expect(r.status).toBe(200);
  });
  it('al escribir cookies de sesión la respuesta no se cachea', async () => {
    getUser.mockImplementation(async () => {
      estado.opciones.cookies.setAll([{ name: 'sb', value: 'v', options: {} }], { 'X-Prueba': '1' });
      return { data: { user: null }, error: null };
    });
    const r = await proxy(peticion());
    expect(r.headers.get('Cache-Control')).toBe('private, no-store');
    expect(r.headers.get('X-Prueba')).toBe('1');
    expect(r.cookies.get('sb')?.value).toBe('v');
  });
});
