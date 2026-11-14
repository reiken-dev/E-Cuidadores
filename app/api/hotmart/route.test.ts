import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Doble de Supabase: registra cada operación en `llamadas` y devuelve lo que se configure en `cfg`.
const { cfg, llamadas, createClient } = vi.hoisted(() => {
  type Fila = Record<string, unknown>;
  const cfg = {
    previo: null as { id: number } | null,
    errPrevio: null as unknown,
    usuarios: [] as { id: string; email: string; email_confirmed_at: string | null }[],
    errListado: null as unknown,
    errEstado: null as unknown,
    errAviso: null as { code?: string } | null,
    lanzar: false,
  };
  const llamadas: { op: string; tabla?: string; fila?: Fila; opciones?: Fila }[] = [];
  const createClient = vi.fn(() => {
    if (cfg.lanzar) throw new Error('boom con datos@del.comprador');
    return {
      from: (tabla: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => {
                llamadas.push({ op: 'buscar-previo', tabla });
                return { data: cfg.previo, error: cfg.errPrevio };
              },
            }),
          }),
        }),
        upsert: async (fila: Fila, opciones: Fila) => {
          llamadas.push({ op: 'upsert', tabla, fila, opciones });
          return { error: cfg.errEstado };
        },
        insert: async (fila: Fila) => {
          llamadas.push({ op: 'insert', tabla, fila });
          return { error: cfg.errAviso };
        },
      }),
      auth: {
        admin: {
          listUsers: async () => {
            llamadas.push({ op: 'listar-usuarios' });
            return cfg.errListado ? { data: null, error: cfg.errListado } : { data: { users: cfg.usuarios }, error: null };
          },
        },
      },
    };
  });
  return { cfg, llamadas, createClient };
});
vi.mock('@supabase/supabase-js', () => ({ createClient }));

import { POST } from './route';

const TOKEN = 'token-de-prueba-largo';
const CORREO = 'compradora@ejemplo.com';

const aviso = (evento: string, extra: Record<string, unknown> = {}) => ({
  event: evento,
  data: {
    purchase: { transaction: 'HP-1', price: { value: 59.99, currency_value: 'USD' } },
    buyer: { email: CORREO },
    product: { id: 123 },
    subscription: { plan: { name: 'Plan Mensual' }, subscriber: { code: 'SUB-1' } },
    date_next_charge: Date.UTC(2027, 0, 15),
    ...extra,
  },
});

const enviar = (cuerpo: unknown, token: string | null = TOKEN) =>
  POST(
    new Request('http://localhost/api/hotmart', {
      method: 'POST',
      headers: token === null ? {} : { 'x-hotmart-hottok': token },
      body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    })
  );

const anotacion = () => llamadas.find((l) => l.tabla === 'payment_events' && l.op === 'insert');
const escrituras = () => llamadas.filter((l) => l.op === 'upsert' || l.op === 'insert');
const confirmado = { id: 'u1', email: CORREO, email_confirmed_at: '2026-11-14T00:00:00Z' };
const ENV = { HOTMART_HOTTOK: TOKEN, NEXT_PUBLIC_SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'clave-de-servicio' };
const espias = () => (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
let consola: ReturnType<typeof espias>;

beforeEach(() => {
  Object.assign(process.env, ENV);
  Object.assign(cfg, { previo: null, errPrevio: null, usuarios: [], errListado: null, errEstado: null, errAviso: null, lanzar: false });
  llamadas.length = 0;
  createClient.mockClear();
  consola = espias();
});

afterEach(() => {
  // Ninguna ruta de ninguna prueba escribe en logs: los datos del comprador no salen de aquí.
  for (const e of consola) expect(e).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  for (const k of Object.keys(ENV)) delete process.env[k];
});

describe('POST /api/hotmart · configuración y autenticidad', () => {
  it('sin configuración responde 503 (Hotmart reintenta) y no toca nada', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(503);
    expect(createClient).not.toHaveBeenCalled();
  });
  it('sin token o con token incorrecto responde 401 y no lee ni escribe nada', async () => {
    expect((await enviar(aviso('PURCHASE_APPROVED'), null)).status).toBe(401);
    expect((await enviar(aviso('PURCHASE_APPROVED'), 'otro-token')).status).toBe(401);
    expect((await enviar(aviso('PURCHASE_APPROVED'), TOKEN.slice(0, -1))).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
    expect(llamadas).toEqual([]);
  });
});

describe('POST /api/hotmart · avisos que no se procesan', () => {
  it('un cuerpo que no es JSON, o al que le falta evento, transacción o correo, es 200 y no escribe', async () => {
    for (const cuerpo of ['no es json', {}, { event: 'PURCHASE_APPROVED' }, aviso('PURCHASE_APPROVED', { buyer: {} })]) {
      const r = await enviar(cuerpo);
      expect(r.status).toBe(200);
    }
    expect(escrituras()).toEqual([]);
  });
  it('un evento que no usamos es 200 y no escribe nada (ni datos del comprador)', async () => {
    const r = await enviar(aviso('ALGO_NUEVO'));
    expect(r.status).toBe(200);
    expect(escrituras()).toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe('POST /api/hotmart · idempotencia', () => {
  it('un aviso ya procesado responde 200 «repetido» y no vuelve a escribir', async () => {
    cfg.previo = { id: 7 };
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(await r.json()).toEqual({ ok: true, repetido: true });
    expect(escrituras()).toEqual([]);
  });
  it('si dos envíos iguales llegan a la vez, la restricción única (23505) también cuenta como repetido', async () => {
    cfg.usuarios = [confirmado];
    cfg.errAviso = { code: '23505' };
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, repetido: true });
  });
});

describe('POST /api/hotmart · fallos: 500 para que Hotmart reintente', () => {
  it('falla la consulta previa', async () => {
    cfg.errPrevio = { message: 'x' };
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(500);
    expect(escrituras()).toEqual([]);
  });
  it('falla el listado de usuarios', async () => {
    cfg.errListado = { message: 'x' };
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(500);
    expect(escrituras()).toEqual([]);
  });
  it('falla el guardado del estado: el aviso NO se anota como procesado', async () => {
    cfg.usuarios = [confirmado];
    cfg.errEstado = { message: 'x' };
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(500);
    expect(llamadas.some((l) => l.tabla === 'payment_events' && l.op === 'insert')).toBe(false);
  });
  it('falla la anotación del aviso', async () => {
    cfg.usuarios = [confirmado];
    cfg.errAviso = { code: 'XX000' };
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(500);
  });
  it('una excepción inesperada también es 500, sin escribir nada en logs ni devolver el error', async () => {
    cfg.lanzar = true;
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain('comprador');
  });
});

describe('POST /api/hotmart · compras, cancelaciones y reembolsos', () => {
  it('una compra de alguien con cuenta confirmada activa su suscripción con plan y fin de periodo', async () => {
    cfg.usuarios = [confirmado];
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(await r.json()).toEqual({ ok: true });
    const estado = llamadas.find((l) => l.tabla === 'subscriptions');
    expect(estado?.opciones).toEqual({ onConflict: 'user_id' });
    expect(estado?.fila).toMatchObject({
      user_id: 'u1',
      status: 'active',
      plan: 'mensual',
      hotmart_subscriber_code: 'SUB-1',
      current_period_end: new Date(Date.UTC(2027, 0, 15)).toISOString(),
    });
  });
  it('sin cuenta, la compra queda pendiente por correo y se enlaza al confirmar', async () => {
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(r.status).toBe(200);
    expect(llamadas.some((l) => l.tabla === 'subscriptions')).toBe(false);
    const pendiente = llamadas.find((l) => l.tabla === 'pending_purchases');
    expect(pendiente?.fila).toMatchObject({ buyer_email: CORREO, status: 'active' });
    expect(pendiente?.opciones).toEqual({ onConflict: 'buyer_email' });
  });
  it('una cuenta con el correo SIN confirmar no recibe la compra: queda pendiente', async () => {
    cfg.usuarios = [{ ...confirmado, email_confirmed_at: null }];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(llamadas.some((l) => l.tabla === 'subscriptions')).toBe(false);
    expect(llamadas.some((l) => l.tabla === 'pending_purchases')).toBe(true);
  });
  it('el correo se compara sin distinguir mayúsculas', async () => {
    cfg.usuarios = [{ ...confirmado, email: 'Compradora@Ejemplo.COM' }];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(llamadas.find((l) => l.tabla === 'subscriptions')?.fila).toMatchObject({ user_id: 'u1' });
  });
  it('una cancelación pasa la suscripción a canceled (conserva lo ya pagado)', async () => {
    cfg.usuarios = [confirmado];
    await enviar(aviso('SUBSCRIPTION_CANCELLATION'));
    expect(llamadas.find((l) => l.tabla === 'subscriptions')?.fila).toMatchObject({ status: 'canceled' });
  });
  it('un reembolso la pasa a refunded y resta el importe en el libro', async () => {
    cfg.usuarios = [confirmado];
    await enviar(aviso('PURCHASE_REFUNDED'));
    expect(llamadas.find((l) => l.tabla === 'subscriptions')?.fila).toMatchObject({ status: 'refunded' });
    expect(anotacion()?.fila).toMatchObject({ event: 'PURCHASE_REFUNDED', amount_minor: -5999, currency: 'USD' });
  });
  it('un aviso sin plan ni fecha no borra lo ya guardado: solo escribe lo que llegó', async () => {
    cfg.usuarios = [confirmado];
    await enviar(aviso('SUBSCRIPTION_CANCELLATION', { subscription: undefined, date_next_charge: undefined }));
    const fila = llamadas.find((l) => l.tabla === 'subscriptions')?.fila ?? {};
    expect(fila).not.toHaveProperty('plan');
    expect(fila).not.toHaveProperty('current_period_end');
    expect(fila).not.toHaveProperty('hotmart_subscriber_code');
  });
});

describe('POST /api/hotmart · orden y privacidad', () => {
  it('el aviso se anota DESPUÉS de guardar el estado', async () => {
    cfg.usuarios = [confirmado];
    await enviar(aviso('PURCHASE_APPROVED'));
    const orden = escrituras().map((l) => l.tabla);
    expect(orden).toEqual(['subscriptions', 'payment_events']);
  });
  it('el payload guardado solo lleva el producto: nada del comprador', async () => {
    cfg.usuarios = [confirmado];
    await enviar(aviso('PURCHASE_APPROVED'));
    const fila = anotacion()?.fila as { payload: unknown; buyer_email: string };
    expect(fila.payload).toEqual({ producto: '123' });
    expect(JSON.stringify(fila.payload)).not.toContain('ejemplo.com');
    expect(fila.buyer_email).toBe(CORREO);
  });
  it('la respuesta nunca incluye el correo del comprador', async () => {
    for (const evento of ['PURCHASE_APPROVED', 'ALGO_NUEVO']) {
      expect(JSON.stringify(await (await enviar(aviso(evento))).json())).not.toContain('ejemplo.com');
    }
  });
  it('usa la clave de servicio solo en el servidor y sin guardar sesión', async () => {
    cfg.usuarios = [confirmado];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(createClient).toHaveBeenCalledWith('https://p.supabase.co', 'clave-de-servicio', { auth: { persistSession: false, autoRefreshToken: false } });
  });
});
