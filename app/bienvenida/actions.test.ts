import { beforeEach, describe, expect, it, vi } from 'vitest';

const marca = vi.hoisted(() => ({ conexiones: { supabase: true, resend: true } }));
vi.mock('@/lib/marca', () => ({ MARCA: marca }));
const crearClienteServidor = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servidor', () => ({ crearClienteServidor: () => crearClienteServidor() }));
const servicio = vi.hoisted(() => ({ updateUserById: vi.fn() }));
vi.mock('@/lib/supabase/servicio', () => ({ crearClienteServicio: () => ({ auth: { admin: servicio } }) }));
const enviarCorreo = vi.hoisted(() => vi.fn());
vi.mock('@/lib/enviar-correo', () => ({ enviarCorreo: (...a: unknown[]) => enviarCorreo(...a) }));

import { enviarBienvenida } from './actions';

const hace = (min: number) => new Date(Date.now() - min * 60000).toISOString();
function cliente(user: Record<string, unknown> | null, circulos: unknown[] = [{ created_at: hace(1) }], errC: unknown = null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue(user ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'x' } }) },
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: circulos, error: errC }) }) }) }) }),
  };
}
const ana = { id: 'u1', email: 'ana@ejemplo.com', user_metadata: { name: 'Ana María López' } };

beforeEach(() => {
  marca.conexiones.supabase = true;
  marca.conexiones.resend = true;
  crearClienteServidor.mockReset();
  enviarCorreo.mockReset().mockResolvedValue(true);
  servicio.updateUserById.mockReset().mockResolvedValue({ error: null });
});

describe('enviarBienvenida (ECU-4)', () => {
  it('escribe solo a la persona de la sesión y con su primer nombre', async () => {
    crearClienteServidor.mockResolvedValue(cliente(ana));
    expect(await enviarBienvenida()).toEqual({ enviado: true });
    expect(enviarCorreo).toHaveBeenCalledWith('bienvenida', 'ana@ejemplo.com', { nombre: 'Ana' });
  });
  it('apagado (sin resend o sin supabase) no envía', async () => {
    marca.conexiones.resend = false;
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    marca.conexiones.resend = true;
    marca.conexiones.supabase = false;
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('sin sesión, sin correo o sin cliente no envía', async () => {
    crearClienteServidor.mockResolvedValue(cliente(null));
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    crearClienteServidor.mockResolvedValue(cliente({ id: 'u1', email: null }));
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    crearClienteServidor.mockResolvedValue(null);
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('si el círculo no es reciente, no tiene círculo o la lectura falla, no envía', async () => {
    crearClienteServidor.mockResolvedValue(cliente(ana, [{ created_at: hace(60) }]));
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    crearClienteServidor.mockResolvedValue(cliente(ana, []));
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    crearClienteServidor.mockResolvedValue(cliente(ana, [{ created_at: hace(1) }], { message: 'x' }));
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('si el envío falla o algo lanza, no lanza', async () => {
    crearClienteServidor.mockResolvedValue(cliente(ana));
    enviarCorreo.mockRejectedValue(new Error('x'));
    expect(await enviarBienvenida()).toEqual({ enviado: false });
  });
  it('solo UNA vez: si la cuenta ya tiene la marca, repetir la llamada no envía otro correo', async () => {
    crearClienteServidor.mockResolvedValue(cliente({ ...ana, app_metadata: { bienvenida_enviada: true } }));
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('anota la marca ANTES de enviar y, si el envío falla, intenta quitarla', async () => {
    crearClienteServidor.mockResolvedValue(cliente({ ...ana, app_metadata: { otro: 1 } }));
    enviarCorreo.mockResolvedValue(false);
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    expect(servicio.updateUserById).toHaveBeenNthCalledWith(1, 'u1', { app_metadata: { otro: 1, bienvenida_enviada: true } });
    expect(servicio.updateUserById).toHaveBeenNthCalledWith(2, 'u1', { app_metadata: { otro: 1, bienvenida_enviada: false } });
  });
  it('si no se puede anotar la marca, no se envía', async () => {
    crearClienteServidor.mockResolvedValue(cliente(ana));
    servicio.updateUserById.mockResolvedValue({ error: { message: 'x' } });
    expect(await enviarBienvenida()).toEqual({ enviado: false });
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
});
