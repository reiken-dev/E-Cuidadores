import { beforeEach, describe, expect, it, vi } from 'vitest';

const crearClienteServicio = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servicio', () => ({ crearClienteServicio: () => crearClienteServicio() }));

import { confirmarBaja } from './actions';
import { firmarBaja } from '@/lib/baja';

const SECRETO = 'un-secreto-de-prueba-largo-de-32-caracteres!!';
const U1 = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  process.env.BAJA_SECRET = SECRETO;
  crearClienteServicio.mockReset();
});

describe('confirmarBaja', () => {
  it('con un enlace válido da de baja a esa persona (id del enlace, no del navegador)', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    crearClienteServicio.mockReturnValue({ rpc });
    expect(await confirmarBaja(firmarBaja(U1, SECRETO))).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('darse_de_baja', { p_user: U1 });
  });
  it('un enlace inválido, manipulado o vacío no hace nada', async () => {
    const rpc = vi.fn();
    crearClienteServicio.mockReturnValue({ rpc });
    for (const malo of [undefined, '', 'x.y', `${U1}.${'a'.repeat(43)}`]) expect(await confirmarBaja(malo)).toEqual({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('sin BAJA_SECRET o sin clave de servicio falla cerrado; un error de la base no es éxito', async () => {
    delete process.env.BAJA_SECRET;
    crearClienteServicio.mockReturnValue({ rpc: vi.fn() });
    expect(await confirmarBaja(firmarBaja(U1, SECRETO))).toEqual({ ok: false });
    process.env.BAJA_SECRET = SECRETO;
    crearClienteServicio.mockReturnValue(null);
    expect(await confirmarBaja(firmarBaja(U1, SECRETO))).toEqual({ ok: false });
    crearClienteServicio.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ error: { message: 'x' } }) });
    expect(await confirmarBaja(firmarBaja(U1, SECRETO))).toEqual({ ok: false });
    crearClienteServicio.mockReturnValue({ rpc: vi.fn().mockRejectedValue(new Error('red')) });
    expect(await confirmarBaja(firmarBaja(U1, SECRETO))).toEqual({ ok: false });
  });
});
