import { beforeEach, describe, expect, it, vi } from 'vitest';

const marca = vi.hoisted(() => ({ conexiones: { supabase: true } }));
vi.mock('@/lib/marca', () => ({ MARCA: marca }));
const crearClienteServidor = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servidor', () => ({ crearClienteServidor: () => crearClienteServidor() }));
const crearClienteServicio = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servicio', () => ({ crearClienteServicio: () => crearClienteServicio() }));
const tieneConsentimientos = vi.hoisted(() => vi.fn());
vi.mock('@/lib/alta', () => ({ tieneConsentimientos: (...a: unknown[]) => tieneConsentimientos(...a) }));

import { crearInvitacion, leerInvitacion, revocarInvitacion, unirme } from './actions';

const CODIGO = 'K7QD-3MPX';
const ID = '11111111-1111-1111-1111-111111111111';

/** Cliente de sesión: getUser, y una consulta encadenable que termina en `filas`. */
function sesion(user: { id: string } | null, tablas: Record<string, { data: unknown; error?: unknown }> = {}) {
  const consulta = (t: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'is', 'gt', 'order']) q[m] = () => q;
    q.limit = () => Promise.resolve({ data: tablas[t]?.data ?? [], error: tablas[t]?.error ?? null });
    return q;
  };
  return {
    auth: { getUser: vi.fn().mockResolvedValue(user ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'x' } }) },
    from: vi.fn((t: string) => consulta(t)),
  };
}
const servicio = (rpc: (n: string, a: Record<string, unknown>) => unknown) => ({ rpc: vi.fn(async (n: string, a: Record<string, unknown>) => rpc(n, a)) });

beforeEach(() => {
  marca.conexiones.supabase = true;
  crearClienteServidor.mockReset();
  crearClienteServicio.mockReset();
  tieneConsentimientos.mockReset().mockResolvedValue(true);
});

describe('unirme', () => {
  it('sin Supabase conectado o sin sesión no hace nada', async () => {
    marca.conexiones.supabase = false;
    expect((await unirme(CODIGO, 'Carlos')).ok).toBe(false);
    marca.conexiones.supabase = true;
    crearClienteServidor.mockResolvedValue(sesion(null));
    expect((await unirme(CODIGO, 'Carlos')).ok).toBe(false);
    expect(crearClienteServicio).not.toHaveBeenCalled();
  });
  it('el user sale de la sesión, y el código se normaliza', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u-sesion' }));
    const s = servicio(() => ({ data: 'ok', error: null }));
    crearClienteServicio.mockReturnValue(s);
    expect(await unirme(' k7qd-3mpx ', '  Carlos ')).toEqual({ ok: true });
    expect(s.rpc).toHaveBeenCalledWith('unirse_con_codigo', { p_code: CODIGO, p_user: 'u-sesion', p_name: 'Carlos' });
  });
  it('rechaza nombre vacío o largo y código mal formado, sin llamar al servicio', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u1' }));
    for (const [c, n] of [[CODIGO, ''], [CODIGO, 'x'.repeat(81)], ['../app', 'Carlos'], [null, 'Carlos'], [CODIGO, 7]] as const) {
      expect((await unirme(c, n)).ok).toBe(false);
    }
    expect(crearClienteServicio).not.toHaveBeenCalled();
  });
  it('sin consentimientos guardados no entra', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u1' }));
    tieneConsentimientos.mockResolvedValue(false);
    expect((await unirme(CODIGO, 'Carlos')).ok).toBe(false);
    expect(crearClienteServicio).not.toHaveBeenCalled();
  });
  it('traduce cada respuesta del SQL a un mensaje sin revelar detalles', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u1' }));
    const mensajes = new Set<string>();
    for (const r of ['invalida', 'lleno', 'ya_en_circulo', 'otra-cosa']) {
      crearClienteServicio.mockReturnValue(servicio(() => ({ data: r, error: null })));
      const res = await unirme(CODIGO, 'Carlos');
      expect(res.ok).toBe(false);
      if (!res.ok) mensajes.add(res.error);
    }
    expect(mensajes.size).toBe(3); // «invalida» y lo desconocido comparten mensaje
  });
  it('un error del servicio o sin clave de servicio falla cerrado', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u1' }));
    crearClienteServicio.mockReturnValue(servicio(() => ({ data: null, error: { message: 'boom' } })));
    expect((await unirme(CODIGO, 'Carlos')).ok).toBe(false);
    crearClienteServicio.mockReturnValue(null);
    expect((await unirme(CODIGO, 'Carlos')).ok).toBe(false);
  });
});

describe('crear, leer y revocar la invitación', () => {
  const fila = { id: ID, code: CODIGO, expires_at: '2026-11-22T00:00:00Z' };

  it('leerInvitacion devuelve la vigente o null, y exige sesión', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u1' }, { invitations: { data: [fila] } }));
    expect(await leerInvitacion()).toEqual({ ok: true, invitacion: { id: ID, codigo: CODIGO, venceEl: fila.expires_at } });
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u1' }));
    expect(await leerInvitacion()).toEqual({ ok: true, invitacion: null });
    crearClienteServidor.mockResolvedValue(sesion(null));
    expect((await leerInvitacion()).ok).toBe(false);
  });
  it('crearInvitacion usa el círculo de la sesión y un código al azar válido', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u-org' }, { circles: { data: [{ id: 'c1' }] }, invitations: { data: [fila] } }));
    const s = servicio(() => ({ data: '2026-11-22T00:00:00Z', error: null }));
    crearClienteServicio.mockReturnValue(s);
    const r = await crearInvitacion();
    expect(r.ok).toBe(true);
    const [nombre, args] = s.rpc.mock.calls[0];
    expect(nombre).toBe('crear_invitacion');
    expect(args).toMatchObject({ p_circle: 'c1', p_user: 'u-org' });
    expect(args.p_code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
  it('quien no creó ningún círculo no crea invitaciones', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u-hermano' }, { circles: { data: [] } }));
    expect((await crearInvitacion()).ok).toBe(false);
    expect(crearClienteServicio).not.toHaveBeenCalled();
  });
  it('si el SQL no confirma (no es el organizador) no hay éxito', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u1' }, { circles: { data: [{ id: 'c1' }] } }));
    crearClienteServicio.mockReturnValue(servicio(() => ({ data: null, error: null })));
    expect((await crearInvitacion()).ok).toBe(false);
  });
  it('revocarInvitacion valida el id y que el SQL lo confirme', async () => {
    crearClienteServidor.mockResolvedValue(sesion({ id: 'u1' }));
    const s = servicio(() => ({ data: true, error: null }));
    crearClienteServicio.mockReturnValue(s);
    expect((await revocarInvitacion('no-es-uuid')).ok).toBe(false);
    expect((await revocarInvitacion(undefined)).ok).toBe(false);
    expect(s.rpc).not.toHaveBeenCalled();
    expect((await revocarInvitacion(ID)).ok).toBe(true);
    expect(s.rpc).toHaveBeenCalledWith('revocar_invitacion', { p_id: ID, p_user: 'u1' });
    crearClienteServicio.mockReturnValue(servicio(() => ({ data: false, error: null })));
    expect((await revocarInvitacion(ID)).ok).toBe(false);
  });
});
