import { beforeEach, describe, expect, it, vi } from 'vitest';

const ejecutarRetencion = vi.hoisted(() => vi.fn());
vi.mock('@/lib/cron-retencion', async (original) => ({ ...(await original<typeof import('@/lib/cron-retencion')>()), ejecutarRetencion: (...a: unknown[]) => ejecutarRetencion(...a) }));
const crearClienteServicio = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/servicio', () => ({ crearClienteServicio: () => crearClienteServicio() }));

import { GET } from './route';

const SECRETO = 'cron-secreto-de-prueba';
const pedir = (cabecera: string | null = `Bearer ${SECRETO}`, query = '') =>
  GET(new Request(`http://localhost/api/cron/retencion${query}`, { headers: cabecera === null ? {} : { authorization: cabecera } }));

beforeEach(() => {
  process.env.CRON_SECRET = SECRETO;
  process.env.BAJA_SECRET = 'un-secreto-de-prueba-largo-de-32-caracteres!!';
  ejecutarRetencion.mockReset().mockResolvedValue({ ok: true, simulacion: false, marketing: false, pagador: { candidatos: 0, enviados: 0 }, resumen: { candidatos: 0, enviados: 0 } });
  crearClienteServicio.mockReset().mockReturnValue({});
});

describe('GET /api/cron/retencion (ECU-6)', () => {
  it('sin CRON_SECRET responde 503 y NO queda abierta', async () => {
    delete process.env.CRON_SECRET;
    expect((await pedir()).status).toBe(503);
    expect((await pedir(null)).status).toBe(503);
    expect(ejecutarRetencion).not.toHaveBeenCalled();
  });
  it('sin el secreto correcto responde 401 y no toca la base', async () => {
    for (const malo of [null, '', 'Bearer', `Bearer ${SECRETO}x`, SECRETO, 'Bearer otro']) expect((await pedir(malo)).status).toBe(401);
    expect(crearClienteServicio).not.toHaveBeenCalled();
    expect(ejecutarRetencion).not.toHaveBeenCalled();
  });
  it('con el secreto ejecuta con el marketing apagado (MARKETING_ACTIVO = false) y devuelve solo contadores', async () => {
    const r = await pedir();
    expect(r.status).toBe(200);
    expect(ejecutarRetencion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ simular: false, marketingActivo: false }));
    expect(JSON.stringify(await r.json())).not.toMatch(/@/);
  });
  it('?simular=1 pide simulación', async () => {
    await pedir(undefined, '?simular=1');
    expect(ejecutarRetencion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ simular: true }));
  });
  it('un fallo de lectura es 500, la falta de BAJA_SECRET 503, y una excepción no filtra detalles', async () => {
    ejecutarRetencion.mockResolvedValueOnce({ ok: false, motivo: 'lectura' });
    expect((await pedir()).status).toBe(500);
    ejecutarRetencion.mockResolvedValueOnce({ ok: false, motivo: 'configuracion' });
    expect((await pedir()).status).toBe(503);
    ejecutarRetencion.mockRejectedValueOnce(new Error('ana@ejemplo.com'));
    const r = await pedir();
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain('ana@');
  });
  it('sin clave de servicio responde 503', async () => {
    crearClienteServicio.mockReturnValue(null);
    expect((await pedir()).status).toBe(503);
  });
});
