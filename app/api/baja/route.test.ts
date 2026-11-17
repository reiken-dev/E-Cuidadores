import { beforeEach, describe, expect, it, vi } from 'vitest';

const crearClienteServicio = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servicio', () => ({ crearClienteServicio: () => crearClienteServicio() }));

import { POST } from './route';
import { firmarBaja } from '@/lib/baja';

const SECRETO = 'un-secreto-de-prueba-largo-de-32-caracteres!!';
const U1 = '11111111-1111-4111-8111-111111111111';
const pedir = (t: string | null, cuerpo = 'List-Unsubscribe=One-Click') =>
  POST(new Request(`http://localhost/api/baja${t === null ? '' : `?t=${encodeURIComponent(t)}`}`, { method: 'POST', body: cuerpo }));

beforeEach(() => {
  process.env.BAJA_SECRET = SECRETO;
  crearClienteServicio.mockReset();
});

describe('POST /api/baja (baja con un clic)', () => {
  it('con el enlace firmado da de baja y responde 200', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    crearClienteServicio.mockReturnValue({ rpc });
    expect((await pedir(firmarBaja(U1, SECRETO)!)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('darse_de_baja', { p_user: U1 });
  });
  it('un POST sin el cuerpo «List-Unsubscribe=One-Click» (RFC 8058) no es una baja de un clic', async () => {
    const rpc = vi.fn();
    crearClienteServicio.mockReturnValue({ rpc });
    expect((await pedir(firmarBaja(U1, SECRETO)!, '')).status).toBe(400);
    expect((await pedir(firmarBaja(U1, SECRETO)!, 'otra=cosa')).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('sin firma válida responde 400 y no toca la base', async () => {
    const rpc = vi.fn();
    crearClienteServicio.mockReturnValue({ rpc });
    expect((await pedir(null)).status).toBe(400);
    expect((await pedir(`${U1}.${'a'.repeat(43)}`)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('si la base falla responde 5xx y sin clave de servicio 503', async () => {
    crearClienteServicio.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ error: { message: 'x' } }) });
    expect((await pedir(firmarBaja(U1, SECRETO)!)).status).toBe(500);
    crearClienteServicio.mockReturnValue(null);
    expect((await pedir(firmarBaja(U1, SECRETO)!)).status).toBe(503);
  });
});
