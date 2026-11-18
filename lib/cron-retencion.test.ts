import { beforeEach, describe, expect, it, vi } from 'vitest';

const enviarCorreo = vi.hoisted(() => vi.fn());
const resend = vi.hoisted(() => ({ configurado: true }));
vi.mock('./enviar-correo', () => ({ enviarCorreo: (...a: unknown[]) => enviarCorreo(...a), resendConfigurado: () => resend.configurado }));

import { bearerValido, ejecutarRetencion, PRESUPUESTO_MS, TOPE_POR_CORRIDA } from './cron-retencion';

const SECRETO = 'un-secreto-de-prueba-largo-de-32-caracteres!!';
const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const DOMINGO = new Date('2026-11-22T14:00:00Z');
const LUNES = new Date('2026-11-23T14:00:00Z');

interface Cfg {
  fantasmas: unknown[];
  resumen: unknown[];
  errFantasmas: unknown;
  errResumen: unknown;
  reservas: Record<string, boolean>;
  errReserva: unknown;
}
const cfg: Cfg = { fantasmas: [], resumen: [], errFantasmas: null, errResumen: null, reservas: {}, errReserva: null };
const llamadas: { nombre: string; args: Record<string, unknown> }[] = [];
const db = {
  rpc: async (nombre: string, args: Record<string, unknown>) => {
    llamadas.push({ nombre, args });
    if (nombre === 'candidatos_pagador_fantasma') return { data: cfg.errFantasmas ? null : cfg.fantasmas, error: cfg.errFantasmas };
    if (nombre === 'candidatos_resumen_semanal') return { data: cfg.errResumen ? null : cfg.resumen, error: cfg.errResumen };
    if (nombre === 'reservar_envio') return { data: cfg.errReserva ? null : (cfg.reservas[`${args.p_user}:${args.p_secuencia}`] ?? true), error: cfg.errReserva };
    return { data: null, error: null };
  },
} as never;
const opciones = (o: Partial<Parameters<typeof ejecutarRetencion>[1]> = {}) => ({ simular: false, marketingActivo: true, ahora: LUNES, secretoBaja: SECRETO, sitioUrl: 'https://ejemplo.com', ...o });
const usadas = (n: string) => llamadas.filter((l) => l.nombre === n);
const fantasma = (u = U1) => ({ user_id: u, email: `${u.slice(0, 4)}@ejemplo.com`, clave: '2026-10-20' });
const semana = (u = U1, dosis = 5) => ({ user_id: u, email: `${u.slice(0, 4)}@ejemplo.com`, clave: '2026-W47', dosis, no_dadas: 1 });

beforeEach(() => {
  Object.assign(cfg, { fantasmas: [], resumen: [], errFantasmas: null, errResumen: null, reservas: {}, errReserva: null });
  llamadas.length = 0;
  enviarCorreo.mockReset().mockResolvedValue(true);
  resend.configurado = true;
});

describe('bearerValido', () => {
  it('solo acepta el secreto exacto', () => {
    expect(bearerValido(`Bearer ${SECRETO}`, SECRETO)).toBe(true);
    for (const malo of [null, '', SECRETO, `Bearer ${SECRETO}x`, `bearer ${SECRETO}`, 'Bearer ']) expect(bearerValido(malo, SECRETO)).toBe(false);
    expect(bearerValido(`Bearer ${SECRETO}`, undefined)).toBe(false);
    expect(bearerValido('Bearer ', '')).toBe(false);
  });
});

describe('ejecutarRetencion (ECU-6)', () => {
  it('con el marketing apagado solo cuenta: no reserva ni envía', async () => {
    cfg.fantasmas = [fantasma()];
    const r = await ejecutarRetencion(db, opciones({ marketingActivo: false }));
    expect(r).toMatchObject({ ok: true, marketing: false, pagador: { candidatos: 1, enviados: 0 } });
    expect(usadas('reservar_envio')).toHaveLength(0);
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('en simulación cuenta candidatos aunque el marketing esté encendido, sin reservar ni enviar', async () => {
    cfg.fantasmas = [fantasma(), fantasma(U2)];
    const r = await ejecutarRetencion(db, opciones({ simular: true }));
    expect(r).toMatchObject({ ok: true, simulacion: true, pagador: { candidatos: 2, enviados: 0 } });
    expect(usadas('reservar_envio')).toHaveLength(0);
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('envía el pagador fantasma una vez, reservando antes y con enlace de baja firmado (página y un clic)', async () => {
    cfg.fantasmas = [fantasma()];
    const r = await ejecutarRetencion(db, opciones());
    expect(r).toMatchObject({ ok: true, pagador: { candidatos: 1, enviados: 1 } });
    expect(llamadas.map((l) => l.nombre)).toEqual(['candidatos_pagador_fantasma', 'reservar_envio']);
    const [id, , valores, op] = enviarCorreo.mock.calls[0];
    expect(id).toBe('pagador_fantasma');
    expect(valores).toEqual({});
    expect(op.idempotencia).toBe(`pagador_fantasma/${U1}/2026-10-20`); // Resend no entrega dos veces si se reintenta tras un corte
    expect(op.bajaUrl).toMatch(/^https:\/\/ejemplo\.com\/baja\?t=/);
    expect(op.bajaUnClic).toMatch(/^https:\/\/ejemplo\.com\/api\/baja\?t=/);
  });
  it('si la reserva dice que no (baja, ya recibió un correo hoy o ya enviado), no se envía', async () => {
    cfg.fantasmas = [fantasma()];
    cfg.reservas[`${U1}:pagador_fantasma`] = false;
    const r = await ejecutarRetencion(db, opciones());
    expect(r).toMatchObject({ pagador: { candidatos: 1, enviados: 0 } });
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('si el envío falla, libera la reserva para reintentar en la siguiente corrida', async () => {
    cfg.fantasmas = [fantasma()];
    enviarCorreo.mockResolvedValue(false);
    const r = await ejecutarRetencion(db, opciones());
    expect(r).toMatchObject({ pagador: { enviados: 0 } });
    expect(usadas('liberar_envio')).toEqual([{ nombre: 'liberar_envio', args: { p_user: U1, p_secuencia: 'pagador_fantasma', p_clave: '2026-10-20' } }]);
  });
  it('el resumen solo se lee y se envía los domingos, con conteos y sin más datos', async () => {
    cfg.resumen = [semana(U1, 7)];
    const lunes = await ejecutarRetencion(db, opciones({ ahora: LUNES }));
    expect(lunes).toMatchObject({ resumen: { candidatos: 0, enviados: 0, omitido: 'no es domingo' } });
    expect(usadas('candidatos_resumen_semanal')).toHaveLength(0);
    const domingo = await ejecutarRetencion(db, opciones({ ahora: DOMINGO }));
    expect(domingo).toMatchObject({ resumen: { candidatos: 1, enviados: 1 } });
    expect(enviarCorreo).toHaveBeenCalledWith('resumen_semanal', expect.any(String), { dosis: 7 }, expect.objectContaining({ bajaUrl: expect.any(String) }));
  });
  it('un correo al día: si la misma persona está en las dos listas, gana el pagador fantasma', async () => {
    cfg.fantasmas = [fantasma()];
    cfg.resumen = [semana()];
    cfg.reservas[`${U1}:resumen_semanal`] = false; // la base ya registró el del pagador hoy
    const r = await ejecutarRetencion(db, opciones({ ahora: DOMINGO }));
    expect(r).toMatchObject({ pagador: { enviados: 1 }, resumen: { enviados: 0 } });
    expect(enviarCorreo).toHaveBeenCalledTimes(1);
  });
  it('un error al LEER candidatos es fallo; un error al RESERVAR se cuenta y se sigue con los demás', async () => {
    cfg.errFantasmas = { message: 'x' };
    expect(await ejecutarRetencion(db, opciones())).toEqual({ ok: false, motivo: 'lectura' });
    cfg.errFantasmas = null;
    cfg.errResumen = { message: 'x' };
    expect(await ejecutarRetencion(db, opciones({ ahora: DOMINGO }))).toEqual({ ok: false, motivo: 'lectura' });
    cfg.errResumen = null;
    cfg.fantasmas = [fantasma()];
    cfg.errReserva = { message: 'x' };
    expect(await ejecutarRetencion(db, opciones())).toMatchObject({ ok: true, errores: 1, pagador: { enviados: 0 } });
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('una reserva que falla para una persona no deja sin correo a las demás', async () => {
    cfg.fantasmas = [fantasma(U1), fantasma(U2)];
    const original = (db as unknown as { rpc: (n: string, a: Record<string, unknown>) => Promise<unknown> }).rpc;
    const conFallo = { rpc: async (n: string, a: Record<string, unknown>) => (n === 'reservar_envio' && a.p_user === U1 ? { data: null, error: { message: 'x' } } : original(n, a)) } as never;
    const r = await ejecutarRetencion(conFallo, opciones());
    expect(r).toMatchObject({ ok: true, errores: 1, pagador: { candidatos: 2, enviados: 1 } });
  });
  it('sin Resend configurado, con enlaces a localhost o http, o con BAJA_SECRET igual a CRON_SECRET no envía y lo dice (no «0 enviados»)', async () => {
    cfg.fantasmas = [fantasma()];
    resend.configurado = false;
    expect(await ejecutarRetencion(db, opciones())).toEqual({ ok: false, motivo: 'configuracion' });
    resend.configurado = true;
    for (const sitioUrl of ['http://ejemplo.com', 'https://localhost:3000', 'http://localhost:3000', 'https://127.0.0.1']) {
      expect(await ejecutarRetencion(db, opciones({ sitioUrl }))).toEqual({ ok: false, motivo: 'configuracion' });
    }
    expect(await ejecutarRetencion(db, opciones({ secretoCron: SECRETO }))).toEqual({ ok: false, motivo: 'configuracion' });
    expect(usadas('reservar_envio')).toHaveLength(0); // no se reservó nada
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it('se corta por tiempo antes del límite de la función; lo que falta queda para la siguiente corrida', async () => {
    cfg.fantasmas = [fantasma(U1), fantasma(U2)];
    let t = 0;
    const r = await ejecutarRetencion(db, opciones({ reloj: () => (t += PRESUPUESTO_MS / 2 + 1) }));
    expect(r).toMatchObject({ ok: true, cortado: true });
    expect(usadas('reservar_envio').length).toBeLessThan(2);
  });
  it('sin BAJA_SECRET no envía marketing (no habría baja válida); en simulación sí cuenta', async () => {
    cfg.fantasmas = [fantasma()];
    expect(await ejecutarRetencion(db, opciones({ secretoBaja: undefined }))).toEqual({ ok: false, motivo: 'configuracion' });
    expect(await ejecutarRetencion(db, opciones({ secretoBaja: 'corto' }))).toEqual({ ok: false, motivo: 'configuracion' });
    expect(enviarCorreo).not.toHaveBeenCalled();
    expect(await ejecutarRetencion(db, opciones({ secretoBaja: undefined, simular: true }))).toMatchObject({ ok: true });
  });
  it('pide como máximo el tope por corrida', async () => {
    await ejecutarRetencion(db, opciones({ ahora: DOMINGO }));
    expect(usadas('candidatos_pagador_fantasma')[0].args).toEqual({ p_limite: TOPE_POR_CORRIDA });
    expect(TOPE_POR_CORRIDA).toBe(40);
  });
  it('no escribe nada en consola y la respuesta no lleva correos', async () => {
    const consola = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    cfg.fantasmas = [fantasma()];
    const r = await ejecutarRetencion(db, opciones());
    for (const e of consola) expect(e).not.toHaveBeenCalled();
    expect(JSON.stringify(r)).not.toMatch(/@/);
    vi.restoreAllMocks();
  });
});
