import { beforeEach, describe, expect, it, vi } from 'vitest';

const marca = vi.hoisted(() => ({ conexiones: { supabase: true } }));
vi.mock('@/lib/marca', () => ({ MARCA: marca }));
const crearClienteServidor = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servidor', () => ({ crearClienteServidor: () => crearClienteServidor() }));
const guardarConsentimientos = vi.hoisted(() => vi.fn());
vi.mock('@/lib/alta', () => ({ guardarConsentimientos: (...a: unknown[]) => guardarConsentimientos(...a) }));

import { aceptarConsentimientos } from './actions';

const conUsuario = (user: { id: string } | null) => ({
  auth: { getUser: vi.fn().mockResolvedValue(user ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'x' } }) },
});

describe('aceptarConsentimientos', () => {
  beforeEach(() => {
    marca.conexiones.supabase = true;
    crearClienteServidor.mockReset();
    guardarConsentimientos.mockReset().mockResolvedValue({ ok: true, guardados: true });
  });

  it('con Supabase desconectado no guarda nada', async () => {
    marca.conexiones.supabase = false;
    expect((await aceptarConsentimientos({ terminos: true, salud: true })).ok).toBe(false);
    expect(guardarConsentimientos).not.toHaveBeenCalled();
  });
  it('sin cliente (faltan variables) no guarda nada', async () => {
    crearClienteServidor.mockResolvedValue(null);
    expect((await aceptarConsentimientos({ terminos: true, salud: true })).ok).toBe(false);
    expect(guardarConsentimientos).not.toHaveBeenCalled();
  });
  it('sin sesión no guarda nada', async () => {
    crearClienteServidor.mockResolvedValue(conUsuario(null));
    const r = await aceptarConsentimientos({ terminos: true, salud: true });
    expect(r.ok).toBe(false);
    expect(guardarConsentimientos).not.toHaveBeenCalled();
  });
  it('el user_id sale de la sesión, no de lo que mande el navegador', async () => {
    crearClienteServidor.mockResolvedValue(conUsuario({ id: 'u-sesion' }));
    const r = await aceptarConsentimientos({ terminos: true, salud: true, user_id: 'otro' } as never);
    expect(r).toEqual({ ok: true });
    expect(guardarConsentimientos).toHaveBeenCalledWith(expect.anything(), 'u-sesion', { terminos: true, salud: true });
  });
  it('una entrada nula no lanza: cuenta como casillas sin marcar', async () => {
    crearClienteServidor.mockResolvedValue(conUsuario({ id: 'u1' }));
    guardarConsentimientos.mockResolvedValue({ ok: false, error: 'faltan consentimientos', incompletos: true });
    await expect(aceptarConsentimientos(null)).resolves.toEqual({ ok: false, error: expect.any(String) });
    expect(guardarConsentimientos).toHaveBeenCalledWith(expect.anything(), 'u1', { terminos: false, salud: false });
  });
  it('un valor que no es true (p. ej. el texto "true") cuenta como no marcado', async () => {
    crearClienteServidor.mockResolvedValue(conUsuario({ id: 'u1' }));
    await aceptarConsentimientos({ terminos: 'true', salud: true } as never);
    expect(guardarConsentimientos).toHaveBeenCalledWith(expect.anything(), 'u1', { terminos: false, salud: true });
  });
  it('si guardar falla devuelve un error genérico', async () => {
    crearClienteServidor.mockResolvedValue(conUsuario({ id: 'u1' }));
    guardarConsentimientos.mockResolvedValue({ ok: false, error: 'detalle interno' });
    const r = await aceptarConsentimientos({ terminos: true, salud: true });
    expect(r).toEqual({ ok: false, error: 'No pudimos guardar tus aceptaciones. Vuelve a intentarlo.' });
  });
});
