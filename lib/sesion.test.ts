import { beforeEach, describe, expect, it, vi } from 'vitest';

const crearClienteServidor = vi.fn();
vi.mock('./supabase/servidor', () => ({ crearClienteServidor: () => crearClienteServidor() }));

import { sesionDelServidor } from './sesion';

const conUsuario = (resultado: { data: { user: { id: string } | null }; error: unknown }) => ({
  auth: { getUser: vi.fn().mockResolvedValue(resultado) },
});

describe('sesionDelServidor', () => {
  beforeEach(() => crearClienteServidor.mockReset());

  it('sin cliente (faltan variables de Supabase) falla cerrado: null', async () => {
    crearClienteServidor.mockResolvedValue(null);
    expect(await sesionDelServidor()).toBeNull();
  });
  it('con usuario validado devuelve su id', async () => {
    crearClienteServidor.mockResolvedValue(conUsuario({ data: { user: { id: 'u1' } }, error: null }));
    expect(await sesionDelServidor()).toEqual({ userId: 'u1' });
  });
  it('sin usuario devuelve null', async () => {
    crearClienteServidor.mockResolvedValue(conUsuario({ data: { user: null }, error: null }));
    expect(await sesionDelServidor()).toBeNull();
  });
  it('con error de Supabase devuelve null', async () => {
    crearClienteServidor.mockResolvedValue(conUsuario({ data: { user: null }, error: { message: 'jwt expired' } }));
    expect(await sesionDelServidor()).toBeNull();
  });
});

describe('consentimientosAlDia', () => {
  beforeEach(() => crearClienteServidor.mockReset());

  it('sin cliente falla cerrado: false', async () => {
    crearClienteServidor.mockResolvedValue(null);
    const { consentimientosAlDia } = await import('./sesion');
    expect(await consentimientosAlDia()).toBe(false);
  });
});

describe('tieneCirculo', () => {
  beforeEach(() => crearClienteServidor.mockReset());
  const conConsulta = (resp: { data: unknown[] | null; error: unknown }) => ({ from: () => ({ select: () => ({ limit: async () => resp }) }) });

  it('sin cliente (faltan variables) no se sabe: null', async () => {
    crearClienteServidor.mockResolvedValue(null);
    const { tieneCirculo } = await import('./sesion');
    expect(await tieneCirculo()).toBeNull();
  });
  it('con una fila, true; sin filas, false', async () => {
    const { tieneCirculo } = await import('./sesion');
    crearClienteServidor.mockResolvedValue(conConsulta({ data: [{ id: 'c1' }], error: null }));
    expect(await tieneCirculo()).toBe(true);
    crearClienteServidor.mockResolvedValue(conConsulta({ data: [], error: null }));
    expect(await tieneCirculo()).toBe(false);
  });
  it('un error de lectura NO se confunde con «no tiene círculo»: null', async () => {
    const { tieneCirculo } = await import('./sesion');
    crearClienteServidor.mockResolvedValue(conConsulta({ data: null, error: { code: 'XX000' } }));
    expect(await tieneCirculo()).toBeNull();
  });
});
