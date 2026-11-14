import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Doble de Supabase: registra cada operación (con sus argumentos) en `llamadas` y devuelve lo que se configure en `cfg`.
const { cfg, llamadas, createClient, reiniciar } = vi.hoisted(() => {
  type Fila = Record<string, unknown>;
  type Usuario = { id: string; email: string; email_confirmed_at: string | null };
  const cfg = {
    /** Eventos ya anotados de la transacción que se consulta. */
    previos: [] as string[],
    errPrevio: null as unknown,
    /** Cada llamada a listUsers devuelve la lista siguiente (la última se repite). Se respeta `page` y `perPage`. */
    listados: [[]] as Usuario[][],
    errListado: null as unknown,
    errEstado: null as unknown,
    errBorrar: null as unknown,
    errAviso: null as { code?: string } | null,
    lanzar: false,
  };
  const llamadas: { op: string; tabla?: string; fila?: Fila; opciones?: Fila; columna?: string; valor?: unknown; pagina?: number }[] = [];
  let nListados = 0;
  const reiniciar = () => {
    nListados = 0;
  };
  const createClient = vi.fn(() => {
    if (cfg.lanzar) throw new Error('boom con datos@del.comprador');
    return {
      from: (tabla: string) => ({
        select: () => ({
          eq: async (columna: string, valor: unknown) => {
            llamadas.push({ op: 'leer-eventos', tabla, columna, valor });
            return { data: cfg.errPrevio ? null : cfg.previos.map((event) => ({ event })), error: cfg.errPrevio };
          },
        }),
        upsert: async (fila: Fila, opciones: Fila) => {
          llamadas.push({ op: 'upsert', tabla, fila, opciones });
          return { error: cfg.errEstado };
        },
        insert: async (fila: Fila) => {
          llamadas.push({ op: 'insert', tabla, fila });
          return { error: cfg.errAviso };
        },
        delete: () => ({
          eq: async (columna: string, valor: unknown) => {
            llamadas.push({ op: 'borrar', tabla, columna, valor });
            return { error: cfg.errBorrar };
          },
        }),
      }),
      auth: {
        admin: {
          listUsers: async ({ page, perPage }: { page: number; perPage: number }) => {
            llamadas.push({ op: 'listar-usuarios', pagina: page });
            if (cfg.errListado) return { data: null, error: cfg.errListado };
            const lista = cfg.listados[Math.min(nListados, cfg.listados.length - 1)];
            if (page === 1) nListados++;
            return { data: { users: lista.slice((page - 1) * perPage, page * perPage) }, error: null };
          },
        },
      },
    };
  });
  return { cfg, llamadas, createClient, reiniciar };
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

// SUBSCRIPTION_CANCELLATION (formato 2.0.0): no trae `purchase` ni `buyer`; el correo viene en `subscriber`.
const cancelacionReal = (extra: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  event: 'SUBSCRIPTION_CANCELLATION',
  version: '2.0.0',
  data: {
    product: { id: 123 },
    subscriber: { code: 'SUB-1', email: CORREO },
    subscription: { id: 77, plan: { name: 'Plan Mensual' } },
    cancellation_date: Date.UTC(2026, 10, 14),
    date_next_charge: Date.UTC(2026, 11, 14),
    ...extra,
  },
});

const enviar = (cuerpo: unknown, token: string | null = TOKEN, cabecera = 'x-hotmart-hottok') =>
  POST(
    new Request('http://localhost/api/hotmart', {
      method: 'POST',
      headers: token === null ? {} : { [cabecera]: token },
      body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    })
  );

const anotacion = () => llamadas.find((l) => l.tabla === 'payment_events' && l.op === 'insert');
const estadoEscrito = () => llamadas.find((l) => l.tabla === 'subscriptions' && l.op === 'upsert');
const escrituras = () => llamadas.filter((l) => l.op === 'upsert' || l.op === 'insert' || l.op === 'borrar');
const confirmado = { id: 'u1', email: CORREO, email_confirmed_at: '2026-11-14T00:00:00Z' };
const sinConfirmar = { ...confirmado, email_confirmed_at: null };
const ENV = { HOTMART_HOTTOK: TOKEN, NEXT_PUBLIC_SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'clave-de-servicio' };
const espias = () => (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
let consola: ReturnType<typeof espias>;

beforeEach(() => {
  Object.assign(process.env, ENV);
  delete process.env.HOTMART_PRODUCT_ID;
  Object.assign(cfg, { previos: [], errPrevio: null, listados: [[]], errListado: null, errEstado: null, errBorrar: null, errAviso: null, lanzar: false });
  llamadas.length = 0;
  reiniciar();
  createClient.mockClear();
  consola = espias();
});

afterEach(() => {
  // Ninguna ruta de ninguna prueba escribe en logs: los datos del comprador no salen de aquí.
  for (const e of consola) expect(e).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  for (const k of [...Object.keys(ENV), 'HOTMART_PRODUCT_ID']) delete process.env[k];
});

describe('POST /api/hotmart · configuración y autenticidad', () => {
  it('sin configuración responde 503 (Hotmart reintenta) y no toca nada', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(503);
    expect(createClient).not.toHaveBeenCalled();
  });
  it('sin token, vacío, incorrecto, más corto o más largo responde 401 y no lee ni escribe nada', async () => {
    for (const token of [null, '', 'otro-token', TOKEN.slice(0, -1), `${TOKEN}x`]) {
      expect((await enviar(aviso('PURCHASE_APPROVED'), token)).status).toBe(401);
    }
    expect(createClient).not.toHaveBeenCalled();
    expect(llamadas).toEqual([]);
  });
  it('la cabecera se lee sin distinguir mayúsculas', async () => {
    cfg.listados = [[confirmado]];
    expect((await enviar(aviso('PURCHASE_APPROVED'), TOKEN, 'X-HOTMART-HOTTOK')).status).toBe(200);
    expect(estadoEscrito()).toBeDefined();
  });
});

describe('POST /api/hotmart · avisos que no se procesan', () => {
  it('un cuerpo que no es JSON, vacío o de un evento que no usamos es 200 y no escribe', async () => {
    for (const cuerpo of ['no es json', {}, { event: 'ALGO_NUEVO' }]) {
      expect((await enviar(cuerpo)).status).toBe(200);
    }
    expect(escrituras()).toEqual([]);
  });
  it('un evento que SÍ usamos pero incompleto responde 422 (queda fallido en Hotmart) y no escribe', async () => {
    for (const cuerpo of [{ event: 'PURCHASE_APPROVED' }, aviso('PURCHASE_APPROVED', { buyer: {} }), { event: 'SUBSCRIPTION_CANCELLATION', data: {} }]) {
      expect((await enviar(cuerpo)).status).toBe(422);
    }
    expect(escrituras()).toEqual([]);
  });
  it('un evento que no usamos es 200 y no escribe nada (ni datos del comprador)', async () => {
    const r = await enviar(aviso('ALGO_NUEVO'));
    expect(r.status).toBe(200);
    expect(escrituras()).toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });
  it('con HOTMART_PRODUCT_ID definido, un aviso de otro producto de la cuenta se ignora', async () => {
    process.env.HOTMART_PRODUCT_ID = '999';
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(await r.json()).toEqual({ ok: true, ignorado: 'producto distinto' });
    expect(createClient).not.toHaveBeenCalled();
    expect(escrituras()).toEqual([]);
  });
  it('con HOTMART_PRODUCT_ID igual al del aviso, se procesa; sin definirlo, no se filtra', async () => {
    cfg.listados = [[confirmado]];
    process.env.HOTMART_PRODUCT_ID = '123';
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(estadoEscrito()).toBeDefined();
    llamadas.length = 0;
    delete process.env.HOTMART_PRODUCT_ID;
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(estadoEscrito()).toBeDefined();
  });
});

describe('POST /api/hotmart · idempotencia', () => {
  it('consulta los avisos de ESA transacción', async () => {
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(llamadas.find((l) => l.op === 'leer-eventos')).toMatchObject({ tabla: 'payment_events', columna: 'hotmart_transaction', valor: 'HP-1' });
  });
  it('un aviso ya procesado responde 200 «repetido» y no vuelve a escribir', async () => {
    cfg.previos = ['PURCHASE_APPROVED'];
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(await r.json()).toEqual({ ok: true, repetido: true });
    expect(escrituras()).toEqual([]);
  });
  it('otro evento de la misma transacción NO es repetido', async () => {
    cfg.previos = ['PURCHASE_APPROVED'];
    cfg.listados = [[confirmado]];
    const r = await enviar(aviso('PURCHASE_COMPLETE'));
    expect(await r.json()).toEqual({ ok: true });
  });
  it('si dos envíos iguales llegan a la vez, la restricción única (23505) también cuenta como repetido', async () => {
    cfg.listados = [[confirmado]];
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
    cfg.listados = [[confirmado]];
    cfg.errEstado = { message: 'x' };
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(500);
    expect(anotacion()).toBeUndefined();
  });
  it('falla la anotación del aviso', async () => {
    cfg.listados = [[confirmado]];
    cfg.errAviso = { code: 'XX000' };
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(500);
  });
  it('una excepción inesperada también es 500, sin devolver el error', async () => {
    cfg.lanzar = true;
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain('comprador');
  });
});

describe('POST /api/hotmart · compras, cancelaciones y reembolsos', () => {
  it('una compra de alguien con cuenta confirmada activa su suscripción con plan y fin de periodo', async () => {
    cfg.listados = [[confirmado]];
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(await r.json()).toEqual({ ok: true });
    expect(estadoEscrito()?.opciones).toEqual({ onConflict: 'user_id' });
    expect(estadoEscrito()?.fila).toMatchObject({
      user_id: 'u1',
      status: 'active',
      plan: 'mensual',
      hotmart_subscriber_code: 'SUB-1',
      current_period_end: new Date(Date.UTC(2027, 0, 15)).toISOString(),
    });
  });
  it('encuentra a la persona aunque esté en la segunda página de usuarios', async () => {
    const otros = Array.from({ length: 1000 }, (_, i) => ({ id: `x${i}`, email: `otro${i}@ejemplo.com`, email_confirmed_at: '2026-01-01T00:00:00Z' }));
    cfg.listados = [[...otros, confirmado]];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(llamadas.filter((l) => l.op === 'listar-usuarios').map((l) => l.pagina)).toEqual([1, 2]);
    expect(estadoEscrito()?.fila).toMatchObject({ user_id: 'u1' });
  });
  it('sin cuenta, la compra queda pendiente por correo y se enlaza al confirmar', async () => {
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(r.status).toBe(200);
    expect(estadoEscrito()).toBeUndefined();
    const pendiente = llamadas.find((l) => l.tabla === 'pending_purchases' && l.op === 'upsert');
    expect(pendiente?.fila).toMatchObject({ buyer_email: CORREO, status: 'active' });
    expect(pendiente?.opciones).toEqual({ onConflict: 'buyer_email' });
  });
  it('una cuenta con el correo SIN confirmar no recibe la compra: queda pendiente', async () => {
    cfg.listados = [[sinConfirmar]];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(estadoEscrito()).toBeUndefined();
    expect(llamadas.some((l) => l.tabla === 'pending_purchases' && l.op === 'upsert')).toBe(true);
  });
  it('el correo se compara sin distinguir mayúsculas', async () => {
    cfg.listados = [[{ ...confirmado, email: 'Compradora@Ejemplo.COM' }]];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(estadoEscrito()?.fila).toMatchObject({ user_id: 'u1' });
  });
  it('carrera: si la persona confirma su correo justo después de la búsqueda, la compra se aplica y se borra la pendiente', async () => {
    cfg.listados = [[], [confirmado]]; // primera búsqueda: aún no; la segunda: ya confirmó
    const r = await enviar(aviso('PURCHASE_APPROVED'));
    expect(r.status).toBe(200);
    expect(escrituras().map((l) => `${l.op}:${l.tabla}`)).toEqual([
      'upsert:pending_purchases',
      'upsert:subscriptions',
      'borrar:pending_purchases',
      'insert:payment_events',
    ]);
    expect(estadoEscrito()?.fila).toMatchObject({ user_id: 'u1', status: 'active' });
    expect(llamadas.find((l) => l.op === 'borrar')).toMatchObject({ columna: 'buyer_email', valor: CORREO });
  });
  it('carrera: si falla el borrado de la pendiente, 500 para que Hotmart reintente', async () => {
    cfg.listados = [[], [confirmado]];
    cfg.errBorrar = { message: 'x' };
    expect((await enviar(aviso('PURCHASE_APPROVED'))).status).toBe(500);
    expect(anotacion()).toBeUndefined();
  });
  it('una cancelación pasa la suscripción a canceled (conserva lo ya pagado)', async () => {
    cfg.listados = [[confirmado]];
    await enviar(aviso('SUBSCRIPTION_CANCELLATION'));
    expect(estadoEscrito()?.fila).toMatchObject({ status: 'canceled' });
  });
  it('la cancelación con el formato real (correo en `subscriber`, sin `purchase`) se aplica con su fin de periodo', async () => {
    cfg.listados = [[confirmado]];
    const r = await enviar(cancelacionReal());
    expect(await r.json()).toEqual({ ok: true });
    expect(estadoEscrito()?.fila).toMatchObject({
      user_id: 'u1',
      status: 'canceled',
      plan: 'mensual',
      hotmart_subscriber_code: 'SUB-1',
      current_period_end: new Date(Date.UTC(2026, 11, 14)).toISOString(),
    });
    // La clave de idempotencia sale de la suscripción y la fecha de cancelación: un reintento da la misma.
    expect(anotacion()?.fila).toMatchObject({ hotmart_transaction: `SUB-77-${Date.UTC(2026, 10, 14)}`, event: 'SUBSCRIPTION_CANCELLATION' });
  });
  it('un reembolso la pasa a refunded y resta el importe en el libro', async () => {
    cfg.listados = [[confirmado]];
    await enviar(aviso('PURCHASE_REFUNDED'));
    expect(estadoEscrito()?.fila).toMatchObject({ status: 'refunded' });
    expect(anotacion()?.fila).toMatchObject({ event: 'PURCHASE_REFUNDED', amount_minor: -5999, currency: 'USD' });
  });
  it('un aviso sin plan ni fecha no borra lo ya guardado: solo escribe lo que llegó', async () => {
    cfg.listados = [[confirmado]];
    await enviar(aviso('SUBSCRIPTION_CANCELLATION', { subscription: undefined, date_next_charge: undefined }));
    const fila = estadoEscrito()?.fila ?? {};
    expect(fila).not.toHaveProperty('plan');
    expect(fila).not.toHaveProperty('current_period_end');
    expect(fila).not.toHaveProperty('hotmart_subscriber_code');
  });
});

describe('POST /api/hotmart · avisos fuera de orden: no devuelven el acceso', () => {
  it('un aviso de alta que llega DESPUÉS del reembolso de esa transacción no cambia el estado, pero se anota', async () => {
    cfg.previos = ['PURCHASE_REFUNDED'];
    cfg.listados = [[confirmado]];
    for (const evento of ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_DELAYED']) {
      llamadas.length = 0;
      const r = await enviar(aviso(evento));
      expect(r.status).toBe(200);
      expect(estadoEscrito()).toBeUndefined();
      expect(anotacion()?.fila).toMatchObject({ event: evento });
    }
  });
  it('lo mismo con un contracargo previo', async () => {
    cfg.previos = ['PURCHASE_CHARGEBACK'];
    cfg.listados = [[confirmado]];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(estadoEscrito()).toBeUndefined();
  });
  it('una compra nueva (otra transacción) tras un reembolso viejo sí activa el acceso', async () => {
    cfg.previos = []; // la transacción nueva no tiene historial
    cfg.listados = [[confirmado]];
    await enviar(aviso('PURCHASE_APPROVED', { purchase: { transaction: 'HP-2', price: { value: 59.99, currency_value: 'USD' } } }));
    expect(estadoEscrito()?.fila).toMatchObject({ status: 'active' });
  });
  it('el reembolso siempre se aplica, aunque la aprobación no se haya recibido', async () => {
    cfg.previos = [];
    cfg.listados = [[confirmado]];
    await enviar(aviso('PURCHASE_REFUNDED'));
    expect(estadoEscrito()?.fila).toMatchObject({ status: 'refunded' });
  });
  it('cancelado o vencido de un pedido que nunca se pagó (p. ej. un boleto abandonado) no toca la suscripción', async () => {
    cfg.previos = [];
    cfg.listados = [[confirmado]];
    for (const evento of ['PURCHASE_CANCELED', 'PURCHASE_EXPIRED']) {
      llamadas.length = 0;
      expect((await enviar(aviso(evento))).status).toBe(200);
      expect(estadoEscrito()).toBeUndefined();
      expect(anotacion()?.fila).toMatchObject({ event: evento });
    }
  });
  it('cancelado de una transacción que sí se pagó sí cambia el estado', async () => {
    cfg.previos = ['PURCHASE_APPROVED'];
    cfg.listados = [[confirmado]];
    await enviar(aviso('PURCHASE_CANCELED'));
    expect(estadoEscrito()?.fila).toMatchObject({ status: 'canceled' });
  });
});

describe('POST /api/hotmart · orden y privacidad', () => {
  it('el aviso se anota DESPUÉS de guardar el estado', async () => {
    cfg.listados = [[confirmado]];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(escrituras().map((l) => l.tabla)).toEqual(['subscriptions', 'payment_events']);
  });
  it('el payload guardado solo lleva el producto: nada del comprador', async () => {
    cfg.listados = [[confirmado]];
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
    expect(JSON.stringify(await (await enviar({ event: 'PURCHASE_APPROVED' })).json())).not.toContain('ejemplo.com');
  });
  it('usa la clave de servicio solo en el servidor y sin guardar sesión', async () => {
    cfg.listados = [[confirmado]];
    await enviar(aviso('PURCHASE_APPROVED'));
    expect(createClient).toHaveBeenCalledWith('https://p.supabase.co', 'clave-de-servicio', { auth: { persistSession: false, autoRefreshToken: false } });
  });
});
