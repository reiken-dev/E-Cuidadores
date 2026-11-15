// Prueba los archivos SQL en un PostgreSQL real (PGlite, en memoria): que se ejecuten sin error, que la
// retención haga lo que dice y que la seguridad se cumpla con DOS personas y los roles anon/authenticated
// (RLS, atribución, funciones, libro de ingresos y enlace de compras). No toca ningún servicio.
// Si cambias el esquema, esta prueba te avisa.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const leer = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
const C = '00000000-0000-0000-0000-000000000001';
const M = '00000000-0000-0000-0000-0000000000a1';

async function base() {
  const db = new PGlite();
  // Simula lo mínimo de Supabase: roles, el esquema auth (auth.users y auth.uid()) y los privilegios por defecto
  // de public (anon y authenticated pueden tocar las tablas: lo que decide el acceso son RLS y las funciones revocadas).
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  await db.exec(leer('schema.sql'));
  await db.exec(leer('retencion.sql'));
  const u = (await db.query<{ id: string }>(`insert into auth.users(email, email_confirmed_at) values ('a@x.com', now()) returning id`)).rows[0].id;
  await db.exec(`insert into public.circles(id, created_by, patient_name) values ('${C}','${u}','Rosa')`);
  await db.exec(`insert into public.subscriptions(user_id,status,plan) values ('${u}','active','mensual')`);
  await db.exec(`insert into public.meds(id,circle_id,name,times,freq) values ('${M}','${C}','Losartán','{08:00}','{"kind":"daily"}')`);
  return { db, u };
}

/** Ejecuta fn como el rol y el usuario indicados (como lo hace la API de Supabase) y deshace todo al terminar. */
async function como<T>(db: PGlite, rol: 'anon' | 'authenticated' | 'service_role', uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`begin; set local role ${rol}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', true);`);
  try {
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}

/** Organizadora A (paga), hermana B (miembro del círculo) y X (ajena, sin relación con la familia). */
async function dosCuentas() {
  const { db, u: A } = await base();
  const B = (await db.query<{ id: string }>(`insert into auth.users(email, email_confirmed_at) values ('b@x.com', now()) returning id`)).rows[0].id;
  const X = (await db.query<{ id: string }>(`insert into auth.users(email, email_confirmed_at) values ('x@x.com', now()) returning id`)).rows[0].id;
  await db.exec(`insert into public.members(circle_id,user_id,name) values ('${C}','${B}','Bea')`);
  return { db, A, B, X };
}

describe('SQL de Supabase (PostgreSQL real en memoria)', () => {
  it('schema.sql y retencion.sql se ejecutan sin errores', async () => {
    await expect(base()).resolves.toBeTruthy();
  }, 60000);

  it('un círculo pagando y sin actividad aparece como "pagador fantasma"; con actividad, no', async () => {
    const { db, u } = await base();
    expect((await db.query(`select * from public.retention_ghost_circles`)).rows).toHaveLength(1);
    await db.exec(`insert into public.dose_logs(circle_id,med_id,dose_date,dose_time,given_by,given_by_name) values ('${C}','${M}',current_date,'08:00','${u}','Ana')`);
    expect((await db.query(`select * from public.retention_ghost_circles`)).rows).toHaveLength(0);
  }, 60000);

  it('el resumen semanal cuenta dadas y no dadas por separado, sin nombres de medicinas', async () => {
    const { db, u } = await base();
    await db.exec(`insert into public.dose_logs(circle_id,med_id,dose_date,dose_time,given_by,given_by_name) values ('${C}','${M}',current_date,'08:00','${u}','Ana')`);
    await db.exec(`insert into public.dose_logs(circle_id,med_id,dose_date,dose_time,given_by,given_by_name,skipped_reason) values ('${C}','${M}',current_date-1,'08:00','${u}','Ana','olvido')`);
    const d = (await db.query<{ d: Record<string, unknown> }>(`select public.weekly_digest('${C}') as d`)).rows[0].d;
    expect(d).toMatchObject({ dosis_dadas: 1, dosis_no_dadas: 1, novedades: 0, por_miembro: [{ nombre: 'Ana', dosis: 1 }] });
    expect(JSON.stringify(d)).not.toContain('Losartán');
  }, 60000);

  it('un motivo de omisión inventado se rechaza', async () => {
    const { db, u } = await base();
    await expect(
      db.exec(`insert into public.dose_logs(circle_id,med_id,dose_date,dose_time,given_by,given_by_name,skipped_reason) values ('${C}','${M}',current_date,'08:00','${u}','Ana','inventado')`)
    ).rejects.toThrow();
  }, 60000);

  it('al borrar la cuenta de la última persona se borra el círculo y sus datos de salud (nada huérfano)', async () => {
    const { db, u } = await base();
    // (al crear el círculo, su creador ya queda como miembro)
    await db.exec(`delete from auth.users where id='${u}'`);
    expect((await db.query(`select 1 from public.circles where id='${C}'`)).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.meds where circle_id='${C}'`)).rows).toHaveLength(0);
  }, 60000);

  it('con otro miembro, el círculo sigue al borrarse una cuenta', async () => {
    const { db, u } = await base();
    const u2 = (await db.query<{ id: string }>(`insert into auth.users(email) values ('b@x.com') returning id`)).rows[0].id;
    await db.exec(`insert into public.members(circle_id,user_id,name) values ('${C}','${u2}','Bea')`);
    await db.exec(`delete from auth.users where id='${u}'`);
    expect((await db.query(`select 1 from public.circles where id='${C}'`)).rows).toHaveLength(1);
  }, 60000);
});

describe('seguridad con dos personas y los roles anon / authenticated (RLS, funciones y atribución)', () => {
  it('anon no ve ni escribe datos de ninguna familia', async () => {
    const { db } = await dosCuentas();
    // anon ni siquiera puede ejecutar las funciones de RLS (is_member): la lectura se rechaza.
    await expect(como(db, 'anon', null, () => db.query(`select 1 from public.circles`))).rejects.toThrow(/permission denied/);
    await expect(
      como(db, 'anon', null, () =>
        db.query(`insert into public.dose_logs(circle_id,med_id,dose_date,dose_time,given_by_name) values ('${C}','${M}',current_date,'07:00','Intruso')`)
      )
    ).rejects.toThrow();
  }, 60000);

  it('un ajeno no ve medicinas, círculos ni suscripciones de otra familia', async () => {
    const { db, X } = await dosCuentas();
    const cuenta = await como(db, 'authenticated', X, async () => ({
      circulos: (await db.query(`select 1 from public.circles`)).rows.length,
      medicinas: (await db.query(`select 1 from public.meds`)).rows.length,
      suscripciones: (await db.query(`select 1 from public.subscriptions`)).rows.length,
    }));
    expect(cuenta).toEqual({ circulos: 0, medicinas: 0, suscripciones: 0 });
  }, 60000);

  it('un ajeno no puede registrar una dosis en el círculo', async () => {
    const { db, X } = await dosCuentas();
    await expect(
      como(db, 'authenticated', X, () =>
        db.query(`insert into public.dose_logs(circle_id,med_id,dose_date,dose_time,given_by_name) values ('${C}','${M}',current_date,'21:00','Intruso')`)
      )
    ).rejects.toThrow();
  }, 60000);

  it('un hermano ve la familia, y una dosis suya queda a su nombre aunque el navegador envíe otro autor', async () => {
    const { db, A, B } = await dosCuentas();
    const fila = await como(db, 'authenticated', B, async () => {
      expect((await db.query(`select 1 from public.meds`)).rows).toHaveLength(1);
      await db.query(
        `insert into public.dose_logs(circle_id,med_id,dose_date,dose_time,given_by,given_by_name) values ('${C}','${M}',current_date,'20:00','${A}','Ana suplantada')`
      );
      return (await db.query<{ given_by: string; given_by_name: string }>(`select given_by, given_by_name from public.dose_logs where dose_time='20:00'`)).rows[0];
    });
    expect(fila).toEqual({ given_by: B, given_by_name: 'Bea' });
  }, 60000);

  it('una nota queda a nombre de quien la escribe (nombre de members), no del que envía el navegador', async () => {
    const { db, A, B } = await dosCuentas();
    const fila = await como(db, 'authenticated', B, async () => {
      await db.query(
        `insert into public.notes(circle_id,kind,body,author_id,author_name) values ('${C}','otra','Comió bien','${A}','Ana falsa')`
      );
      return (await db.query<{ author_id: string; author_name: string }>(`select author_id, author_name from public.notes`)).rows[0];
    });
    expect(fila).toEqual({ author_id: B, author_name: 'Bea' });
  }, 60000);

  it('con la suscripción de la organizadora vencida, los hermanos solo leen: no pueden registrar dosis', async () => {
    const { db, A, B } = await dosCuentas();
    await db.exec(`update public.subscriptions set status='expired' where user_id='${A}'`);
    await expect(
      como(db, 'authenticated', B, () =>
        db.query(`insert into public.dose_logs(circle_id,med_id,dose_date,dose_time,given_by_name) values ('${C}','${M}',current_date,'22:00','Bea')`)
      )
    ).rejects.toThrow();
    const lectura = await como(db, 'authenticated', B, async () => (await db.query(`select 1 from public.meds`)).rows.length);
    expect(lectura).toBe(1);
  }, 60000);

  it('user_subscribed responde solo por la propia suscripción; suscripcion_vigente no se puede llamar', async () => {
    const { db, A, X } = await dosCuentas();
    const propia = await como(db, 'authenticated', A, async () => (await db.query<{ v: boolean }>(`select public.user_subscribed('${A}') as v`)).rows[0].v);
    expect(propia).toBe(true);
    const ajena = await como(db, 'authenticated', X, async () => (await db.query<{ v: boolean }>(`select public.user_subscribed('${A}') as v`)).rows[0].v);
    expect(ajena).toBe(false);
    await expect(como(db, 'authenticated', X, () => db.query(`select public.suscripcion_vigente('${A}')`))).rejects.toThrow();
    await expect(como(db, 'anon', null, () => db.query(`select public.user_subscribed('${A}')`))).rejects.toThrow();
  }, 60000);

  it('circle_active solo responde a los miembros del círculo', async () => {
    const { db, B, X } = await dosCuentas();
    const dentro = await como(db, 'authenticated', B, async () => (await db.query<{ v: boolean }>(`select public.circle_active('${C}') as v`)).rows[0].v);
    expect(dentro).toBe(true);
    const fuera = await como(db, 'authenticated', X, async () => (await db.query<{ v: boolean }>(`select public.circle_active('${C}') as v`)).rows[0].v);
    expect(fuera).toBe(false);
  }, 60000);

  it('nadie con sesión escribe suscripciones ni lee las compras pendientes', async () => {
    const { db, A, X } = await dosCuentas();
    await db.exec(`insert into public.pending_purchases(buyer_email,status,plan) values ('ajeno@x.com','active','mensual')`);
    await expect(
      como(db, 'authenticated', A, () => db.query(`insert into public.subscriptions(user_id,status,plan) values ('${X}','active','anual')`))
    ).rejects.toThrow();
    // Ahora el rol ni siquiera tiene privilegio sobre la tabla: se rechaza, no devuelve filas vacías.
    await expect(como(db, 'authenticated', A, () => db.query(`select 1 from public.pending_purchases`))).rejects.toThrow(/permission denied/);
  }, 60000);

  it('TRUNCATE no es un atajo: RLS no lo filtra, así que el rol no tiene ese privilegio', async () => {
    const { db, A } = await dosCuentas();
    await expect(como(db, 'authenticated', A, () => db.exec(`truncate public.meds`))).rejects.toThrow(/permission denied/);
    expect((await db.query(`select 1 from public.meds`)).rows).toHaveLength(1);
  }, 60000);

  it('un ajeno no ve a los miembros de la familia; un hermano sí los ve', async () => {
    const { db, B, X } = await dosCuentas();
    const deX = await como(db, 'authenticated', X, async () => (await db.query(`select 1 from public.members`)).rows.length);
    const deB = await como(db, 'authenticated', B, async () => (await db.query(`select 1 from public.members`)).rows.length);
    expect(deX).toBe(0);
    expect(deB).toBe(2);
  }, 60000);

  it('un ajeno no edita ni borra medicinas de otra familia (no ve esa fila, no cambia nada)', async () => {
    const { db, X } = await dosCuentas();
    const editadas = await como(db, 'authenticated', X, async () => (await db.query(`update public.meds set name='Hackeado' where id='${M}' returning id`)).rows.length);
    const borradas = await como(db, 'authenticated', X, async () => (await db.query(`delete from public.meds where id='${M}' returning id`)).rows.length);
    expect(editadas).toBe(0);
    expect(borradas).toBe(0);
    expect((await db.query<{ name: string }>(`select name from public.meds where id='${M}'`)).rows[0].name).toBe('Losartán');
  }, 60000);

  it('solo el autor edita o borra una nota; la hermana no puede tocarla', async () => {
    const { db, A, B } = await dosCuentas();
    await db.exec(`insert into public.notes(circle_id,kind,body,author_id,author_name) values ('${C}','otra','Tomó agua','${A}','Ana')`);
    const editadas = await como(db, 'authenticated', B, async () => (await db.query(`update public.notes set body='Cambiada' returning id`)).rows.length);
    const borradas = await como(db, 'authenticated', B, async () => (await db.query(`delete from public.notes returning id`)).rows.length);
    expect(editadas).toBe(0);
    expect(borradas).toBe(0);
    expect((await db.query<{ body: string }>(`select body from public.notes`)).rows[0].body).toBe('Tomó agua');
  }, 60000);

  it('un hermano no puede cambiar quién creó el círculo, pero sí editar los datos del familiar', async () => {
    const { db, B } = await dosCuentas();
    await expect(como(db, 'authenticated', B, () => db.query(`update public.circles set created_by='${B}' where id='${C}'`))).rejects.toThrow(/permission denied/);
    const editadas = await como(db, 'authenticated', B, async () => (await db.query(`update public.circles set patient_name='Rosa M.' where id='${C}' returning id`)).rows.length);
    expect(editadas).toBe(1);
  }, 60000);

  it('el consentimiento se guarda solo a nombre propio, y cada quien lee solo los suyos', async () => {
    const { db, A, B } = await dosCuentas();
    await db.exec(`insert into public.consents(user_id,purpose,text_version) values ('${A}','terms_privacy_adult','2026-10-10')`);
    await expect(
      como(db, 'authenticated', A, () => db.query(`insert into public.consents(user_id,purpose,text_version) values ('${B}','health_data','2026-10-10')`))
    ).rejects.toThrow();
    const ajenos = await como(db, 'authenticated', B, async () => (await db.query(`select 1 from public.consents`)).rows.length);
    expect(ajenos).toBe(0);
    const propias = await como(db, 'authenticated', A, async () => (await db.query(`insert into public.consents(user_id,purpose,text_version) values ('${A}','health_data','2026-10-10') returning id`)).rows.length);
    expect(propias).toBe(1);
  }, 60000);

  it('los pagos no se leen ni se escriben desde el navegador, ni siquiera con sesión', async () => {
    const { db, A } = await dosCuentas();
    await db.exec(`insert into public.payment_events(hotmart_transaction,event,buyer_email,amount_minor,currency,payload) values ('T7','PURCHASE_APPROVED','a@x.com',5999,'USD','{}')`);
    await expect(como(db, 'authenticated', A, () => db.query(`select 1 from public.payment_events`))).rejects.toThrow(/permission denied/);
    await expect(
      como(db, 'authenticated', A, () => db.query(`insert into public.payment_events(hotmart_transaction,event,buyer_email,payload) values ('T8','X','a@x.com','{}')`))
    ).rejects.toThrow(/permission denied/);
  }, 60000);
});

describe('libro de ingresos y enlace de compras', () => {
  it('un cobro cuenta una sola vez, el reembolso resta y los avisos sin importe no suman', async () => {
    const { db } = await base();
    await db.exec(`insert into public.payment_events(hotmart_transaction,event,buyer_email,amount_minor,currency,payload) values
      ('T1','PURCHASE_APPROVED','a@x.com',5999,'USD','{}'),
      ('T1','PURCHASE_COMPLETE','a@x.com',null,'USD','{}'),
      ('T2','PURCHASE_APPROVED','b@x.com',5999,'USD','{}'),
      ('T1','PURCHASE_REFUNDED','a@x.com',-5999,'USD','{}')`);
    const r = await db.query<{ neto: number; movimientos: number }>(
      `select neto_unidades_menores::int as neto, movimientos::int as movimientos from public.libro_ingresos where currency='USD'`
    );
    expect(r.rows[0]).toEqual({ neto: 5999, movimientos: 3 });
  }, 60000);

  it('no se puede registrar un segundo cobro positivo para la misma transacción', async () => {
    const { db } = await base();
    await db.exec(`insert into public.payment_events(hotmart_transaction,event,buyer_email,amount_minor,currency,payload) values ('T9','PURCHASE_APPROVED','a@x.com',5999,'USD','{}')`);
    await expect(
      db.exec(`insert into public.payment_events(hotmart_transaction,event,buyer_email,amount_minor,currency,payload) values ('T9','OTRO_AVISO','a@x.com',5999,'USD','{}')`)
    ).rejects.toThrow();
  }, 60000);

  it('el libro de ingresos no se lee desde el navegador', async () => {
    const { db, u } = await base();
    await expect(como(db, 'authenticated', u, () => db.query(`select * from public.libro_ingresos`))).rejects.toThrow();
  }, 60000);

  it('una compra que llegó antes que la cuenta se enlaza cuando la persona confirma su correo', async () => {
    const { db } = await base();
    await db.exec(`insert into public.pending_purchases(buyer_email,status,plan,current_period_end) values ('nueva@x.com','active','anual', now() + interval '30 days')`);
    const id = (await db.query<{ id: string }>(`insert into auth.users(email) values ('Nueva@X.com') returning id`)).rows[0].id;
    expect((await db.query(`select 1 from public.subscriptions where user_id='${id}'`)).rows).toHaveLength(0);
    await db.exec(`update auth.users set email_confirmed_at = now() where id='${id}'`);
    const sub = await db.query<{ plan: string; status: string }>(`select plan, status from public.subscriptions where user_id='${id}'`);
    expect(sub.rows).toEqual([{ plan: 'anual', status: 'active' }]);
    expect((await db.query(`select 1 from public.pending_purchases where buyer_email='nueva@x.com'`)).rows).toHaveLength(0);
  }, 60000);

  it('un plan desconocido se guarda como "desconocido", no como mensual', async () => {
    const { db } = await base();
    const id = (await db.query<{ id: string }>(`insert into auth.users(email) values ('d@x.com') returning id`)).rows[0].id;
    await db.exec(`insert into public.subscriptions(user_id,status,plan) values ('${id}','active','desconocido')`);
    expect((await db.query<{ plan: string }>(`select plan from public.subscriptions where user_id='${id}'`)).rows[0].plan).toBe('desconocido');
    await expect(
      db.exec(`insert into public.subscriptions(user_id,status,plan) values ('${(await db.query<{ id: string }>(`insert into auth.users(email) values ('e@x.com') returning id`)).rows[0].id}','active','inventado')`)
    ).rejects.toThrow();
  }, 60000);

  it('un aviso sin nombre de plan no inventa uno: la fila nueva queda "desconocido"', async () => {
    const { db } = await base();
    const id = (await db.query<{ id: string }>(`insert into auth.users(email) values ('f@x.com') returning id`)).rows[0].id;
    await db.exec(`insert into public.subscriptions(user_id,status) values ('${id}','active')`);
    expect((await db.query<{ plan: string }>(`select plan from public.subscriptions where user_id='${id}'`)).rows[0].plan).toBe('desconocido');
  }, 60000);

  it('el mismo aviso (transacción + evento) no se anota dos veces: la base lo rechaza', async () => {
    const { db } = await base();
    await db.exec(`insert into public.payment_events(hotmart_transaction,event,buyer_email,payload) values ('T10','PURCHASE_COMPLETE','a@x.com','{}')`);
    await expect(
      db.exec(`insert into public.payment_events(hotmart_transaction,event,buyer_email,payload) values ('T10','PURCHASE_COMPLETE','a@x.com','{}')`)
    ).rejects.toThrow();
  }, 60000);
  it('quién conserva el acceso según el estado: activa, en gracia y cancelada con lo ya pagado sí; vencida, reembolso y contracargo no', async () => {
    const { db, u } = await base();
    const vigente = async (status: string, finPeriodo: string | null) => {
      await db.exec(`update public.subscriptions set status='${status}', current_period_end=${finPeriodo ? `'${finPeriodo}'::timestamptz` : 'null'} where user_id='${u}'`);
      return (await db.query<{ v: boolean }>(`select public.suscripcion_vigente('${u}') as v`)).rows[0].v;
    };
    const futuro = new Date(Date.now() + 10 * 864e5).toISOString();
    const pasado = new Date(Date.now() - 10 * 864e5).toISOString();
    expect(await vigente('trial', null)).toBe(true);
    expect(await vigente('active', futuro)).toBe(true);
    expect(await vigente('past_due', pasado)).toBe(true);
    expect(await vigente('canceled', futuro)).toBe(true); // cancelada: conserva lo ya pagado
    expect(await vigente('canceled', pasado)).toBe(false);
    expect(await vigente('canceled', null)).toBe(false); // sin fecha de fin no se asume acceso
    expect(await vigente('expired', futuro)).toBe(false);
    expect(await vigente('refunded', futuro)).toBe(false);
    expect(await vigente('chargeback', futuro)).toBe(false);
  }, 60000);
});

describe('permisos de service_role (proyecto con "Automatically expose new tables" desmarcado)', () => {
  /** Como `base()`, pero SIN los privilegios por defecto sobre public: así queda un proyecto con esa opción apagada. */
  async function sinPrivilegiosPorDefecto() {
    const db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls; -- como en Supabase: service_role salta RLS
      create schema auth;
      create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      grant usage on schema auth to anon, authenticated, service_role;
      grant usage on schema public to anon, authenticated, service_role;
    `);
    await db.exec(leer('schema.sql'));
    await db.exec(leer('retencion.sql'));
    return db;
  }
  const leerComoServicio = (db: PGlite, tabla: string) => como(db, 'service_role', null, () => db.query(`select * from public.${tabla}`));

  it('sin permisos-service-role.sql, el webhook no podría leer ni escribir (el fallo que se vio en un proyecto real)', async () => {
    const db = await sinPrivilegiosPorDefecto();
    for (const tabla of ['payment_events', 'pending_purchases', 'subscriptions']) {
      await expect(leerComoServicio(db, tabla)).rejects.toThrow(/permission denied/);
    }
  }, 60000);

  it('con permisos-service-role.sql, service_role lee y escribe lo que usan el webhook y el cron', async () => {
    const db = await sinPrivilegiosPorDefecto();
    await db.exec(leer('permisos-service-role.sql'));
    await como(db, 'service_role', null, async () => {
      await db.exec(`insert into public.pending_purchases(buyer_email,status) values ('p@x.com','active')`);
      await db.exec(`insert into public.payment_events(hotmart_transaction,event,buyer_email,amount_minor,currency,payload) values ('T1','PURCHASE_APPROVED','p@x.com',999,'USD','{}')`);
      expect((await db.query(`select * from public.payment_events`)).rows).toHaveLength(1);
      expect((await db.query(`select * from public.libro_ingresos`)).rows).toHaveLength(1);
      expect((await db.query(`select * from public.retention_ghost_circles`)).rows).toHaveLength(0);
      expect((await db.query(`select public.weekly_digest('00000000-0000-0000-0000-000000000001')`)).rows).toHaveLength(1);
    });
  }, 60000);

  it('se puede ejecutar dos veces sin error (idempotente)', async () => {
    const db = await sinPrivilegiosPorDefecto();
    await db.exec(leer('permisos-service-role.sql'));
    await expect(db.exec(leer('permisos-service-role.sql'))).resolves.not.toThrow();
  }, 60000);

  it('no abre nada a anon ni a authenticated: los pagos y las compras siguen cerrados al navegador', async () => {
    const db = await sinPrivilegiosPorDefecto();
    await db.exec(leer('permisos-service-role.sql'));
    const X = (await db.query<{ id: string }>(`insert into auth.users(email, email_confirmed_at) values ('x@x.com', now()) returning id`)).rows[0].id;
    for (const rol of ['anon', 'authenticated'] as const) {
      for (const tabla of ['payment_events', 'pending_purchases', 'libro_ingresos', 'retention_ghost_circles']) {
        await expect(como(db, rol, rol === 'authenticated' ? X : null, () => db.query(`select * from public.${tabla}`))).rejects.toThrow(/permission denied/);
      }
    }
    await expect(
      como(db, 'authenticated', X, () => db.query(`insert into public.subscriptions(user_id,status) values ('${X}','active')`))
    ).rejects.toThrow();
  }, 60000);
});

describe('datos reales (datos-reales.sql)', () => {
  async function conDatosReales() {
    const t = await dosCuentas();
    await t.db.exec(leer('datos-reales.sql'));
    return t;
  }
  const dosis = (db: PGlite) => db.query<{ given_by: string; given_by_name: string; given_by_self: boolean; skipped_reason: string | null }>(
    `select given_by, given_by_name, given_by_self, skipped_reason from public.dose_logs order by given_at`
  );
  const llamar = (skipped: string | null = null, bySelf = false) =>
    `select public.registrar_dosis('${C}','${M}','2026-11-14','08:00',${skipped ? `'${skipped}'` : 'null'},${bySelf})`;

  it('se ejecuta sin errores y dos veces seguidas (idempotente)', async () => {
    const { db } = await conDatosReales();
    await expect(db.exec(leer('datos-reales.sql'))).resolves.not.toThrow();
  }, 60000);

  it('un miembro registra una dosis y queda firmada con su nombre, aunque el navegador no lo diga', async () => {
    const { db, B } = await conDatosReales();
    await como(db, 'authenticated', B, async () => {
      await db.query(llamar());
      const r = (await dosis(db)).rows;
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({ given_by: B, given_by_name: 'Bea', given_by_self: false, skipped_reason: null });
    });
  }, 60000);

  it('registrar dos veces la misma dosis deja una sola: la última gana (también el motivo de omisión)', async () => {
    const { db, A } = await conDatosReales();
    await como(db, 'authenticated', A, async () => {
      await db.query(llamar());
      await db.query(llamar('olvido'));
      const r = (await dosis(db)).rows;
      expect(r).toHaveLength(1);
      expect(r[0].skipped_reason).toBe('olvido');
      await db.query(llamar(null, true));
      const s = (await dosis(db)).rows;
      expect(s).toHaveLength(1);
      expect(s[0]).toMatchObject({ skipped_reason: null, given_by_self: true });
    });
  }, 60000);

  it('un motivo de omisión inventado se rechaza y NO borra la dosis que ya estaba (transacción)', async () => {
    const { db, A } = await conDatosReales();
    await como(db, 'authenticated', A, async () => {
      await db.query(llamar());
      await db.exec('savepoint antes');
      await expect(db.query(llamar('inventado'))).rejects.toThrow();
      await db.exec('rollback to savepoint antes');
      expect((await dosis(db)).rows).toHaveLength(1);
    });
  }, 60000);

  it('una persona ajena a la familia no puede registrar dosis en ese círculo', async () => {
    const { db, X } = await conDatosReales();
    await expect(como(db, 'authenticated', X, () => db.query(llamar()))).rejects.toThrow();
  }, 60000);

  it('con la suscripción de la organizadora vencida, los hermanos no pueden registrar dosis', async () => {
    const { db, A, B } = await conDatosReales();
    await db.exec(`update public.subscriptions set status='expired' where user_id='${A}'`);
    await expect(como(db, 'authenticated', B, () => db.query(llamar()))).rejects.toThrow();
  }, 60000);

  it('anon no puede ejecutar la función', async () => {
    const { db } = await conDatosReales();
    await expect(como(db, 'anon', null, () => db.query(llamar()))).rejects.toThrow(/permission denied/);
  }, 60000);

  it('cada quien actualiza solo su propia «última visita», y solo esa columna', async () => {
    const { db, A, B } = await conDatosReales();
    await como(db, 'authenticated', B, async () => {
      const propia = await db.query(`update public.members set last_seen_at = now() where user_id = '${B}' returning 1`);
      expect(propia.rows).toHaveLength(1);
      const ajena = await db.query(`update public.members set last_seen_at = now() where user_id = '${A}' returning 1`);
      expect(ajena.rows).toHaveLength(0);
    });
    await expect(
      como(db, 'authenticated', B, () => db.query(`update public.members set name = 'Otro' where user_id = '${B}'`))
    ).rejects.toThrow(/permission denied/);
    await expect(
      como(db, 'authenticated', B, () => db.query(`update public.members set role = 'Organizador' where user_id = '${B}'`))
    ).rejects.toThrow(/permission denied/);
  }, 60000);

  it('un miembro guarda preguntas, fecha de alergias y hitos del círculo; un ajeno no', async () => {
    const { db, B, X } = await conDatosReales();
    await como(db, 'authenticated', B, async () => {
      const r = await db.query(
        `update public.circles set questions = '¿Subimos la dosis?', allergies_at = '2026-11-01', celebrated_milestones = '{racha-7}' where id = '${C}' returning 1`
      );
      expect(r.rows).toHaveLength(1);
    });
    await como(db, 'authenticated', X, async () => {
      const r = await db.query(`update public.circles set questions = 'x' where id = '${C}' returning 1`);
      expect(r.rows).toHaveLength(0);
    });
  }, 60000);

  it('las preguntas tienen tope de 2000 caracteres y la columna de horario existe en medicinas', async () => {
    const { db, A } = await conDatosReales();
    await expect(
      como(db, 'authenticated', A, () => db.query(`update public.circles set questions = '${'x'.repeat(2001)}' where id = '${C}'`))
    ).rejects.toThrow();
    await db.exec(`update public.meds set schedule_from = now() where id = '${M}'`);
    expect((await db.query(`select schedule_from from public.meds where id = '${M}'`)).rows[0]).toBeTruthy();
  }, 60000);

  it('el navegador sigue sin poder cambiar quién creó el círculo ni escribir pagos', async () => {
    const { db, A } = await conDatosReales();
    await expect(
      como(db, 'authenticated', A, () => db.query(`update public.circles set created_by = '${A}' where id = '${C}'`))
    ).rejects.toThrow(/permission denied/);
    await expect(
      como(db, 'authenticated', A, () => db.query(`insert into public.payment_events(hotmart_transaction,event,buyer_email,payload) values ('T','X','a@x.com','{}')`))
    ).rejects.toThrow();
  }, 60000);
});

describe('invitaciones (invitaciones.sql)', () => {
  const CODIGO = 'K7QD-3MPX';
  async function conInvitaciones() {
    const t = await dosCuentas();
    await t.db.exec(leer('datos-reales.sql'));
    await t.db.exec(leer('invitaciones.sql'));
    return t;
  }
  const nuevaCuenta = async (db: PGlite, correo: string) =>
    (await db.query<{ id: string }>(`insert into auth.users(email, email_confirmed_at) values ('${correo}', now()) returning id`)).rows[0].id;
  const crear = (A: string, code = CODIGO) => `select public.crear_invitacion('${C}','${A}','${code}') as vence`;
  const unir = (u: string, code = CODIGO, nombre = 'Carlos') => `select public.unirse_con_codigo('${code}','${u}','${nombre}') as r`;
  const miembros = async (db: PGlite) => Number((await db.query<{ n: string }>(`select count(*) as n from public.members where circle_id = '${C}'`)).rows[0].n);

  it('se ejecuta sin errores y dos veces seguidas (idempotente)', async () => {
    const { db } = await conInvitaciones();
    await expect(db.exec(leer('invitaciones.sql'))).resolves.not.toThrow();
  }, 60000);

  it('el organizador crea el código y quien lo usa entra como miembro', async () => {
    const { db, A } = await conInvitaciones();
    const N = await nuevaCuenta(db, 'n@x.com');
    const vence = (await db.query<{ vence: Date }>(crear(A))).rows[0].vence;
    expect(new Date(vence).getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000);
    expect((await db.query<{ r: string }>(unir(N))).rows[0].r).toBe('ok');
    const fila = (await db.query<{ name: string; role: string }>(`select name, role from public.members where user_id = '${N}'`)).rows[0];
    expect(fila).toEqual({ name: 'Carlos', role: 'Hermano/a' });
  }, 60000);

  it('quien no creó el círculo no puede crear invitaciones', async () => {
    const { db, B } = await conInvitaciones();
    expect((await db.query<{ vence: unknown }>(crear(B))).rows[0].vence).toBeNull();
    expect(Number((await db.query<{ n: number }>(`select count(*) as n from public.invitations`)).rows[0].n)).toBe(0);
  }, 60000);

  it('código inexistente, vencido o revocado: la misma respuesta «invalida»', async () => {
    const { db, A } = await conInvitaciones();
    const N = await nuevaCuenta(db, 'n@x.com');
    await db.query(crear(A));
    const id = (await db.query<{ id: string }>(`select id from public.invitations`)).rows[0].id;
    expect((await db.query<{ r: string }>(unir(N, 'ZZZZ-ZZZZ'))).rows[0].r).toBe('invalida');
    await db.exec(`update public.invitations set expires_at = now() - interval '1 minute'`);
    expect((await db.query<{ r: string }>(unir(N))).rows[0].r).toBe('invalida');
    await db.exec(`update public.invitations set expires_at = now() + interval '1 day'`);
    expect((await db.query<{ r: boolean }>(`select public.revocar_invitacion('${id}','${A}') as r`)).rows[0].r).toBe(true);
    expect((await db.query<{ r: string }>(unir(N))).rows[0].r).toBe('invalida');
    expect(await miembros(db)).toBe(2);
  }, 60000);

  it('solo el organizador revoca; crear una nueva revoca la anterior', async () => {
    const { db, A, B } = await conInvitaciones();
    const N = await nuevaCuenta(db, 'n@x.com');
    await db.query(crear(A));
    const id = (await db.query<{ id: string }>(`select id from public.invitations`)).rows[0].id;
    expect((await db.query<{ r: boolean }>(`select public.revocar_invitacion('${id}','${B}') as r`)).rows[0].r).toBe(false);
    await db.query(crear(A, 'AAAA-2222'));
    expect((await db.query<{ r: string }>(unir(N))).rows[0].r).toBe('invalida');
    expect((await db.query<{ r: string }>(unir(N, 'AAAA-2222'))).rows[0].r).toBe('ok');
  }, 60000);

  it('tope de 12 miembros', async () => {
    const { db, A } = await conInvitaciones();
    await db.query(crear(A));
    for (let i = 0; i < 10; i++) {
      const u = await nuevaCuenta(db, `m${i}@x.com`);
      expect((await db.query<{ r: string }>(unir(u))).rows[0].r).toBe('ok');
    }
    expect(await miembros(db)).toBe(12);
    const extra = await nuevaCuenta(db, 'extra@x.com');
    expect((await db.query<{ r: string }>(unir(extra))).rows[0].r).toBe('lleno');
    expect(await miembros(db)).toBe(12);
  }, 60000);

  it('repetir es idempotente y quien ya está en otro círculo no entra', async () => {
    const { db, A } = await conInvitaciones();
    const N = await nuevaCuenta(db, 'n@x.com');
    await db.query(crear(A));
    await db.query(unir(N));
    expect((await db.query<{ r: string }>(unir(N))).rows[0].r).toBe('ok');
    expect(await miembros(db)).toBe(3);
    const O = await nuevaCuenta(db, 'o@x.com');
    const otro = '00000000-0000-0000-0000-000000000002';
    await db.exec(`insert into public.circles(id, created_by, patient_name) values ('${otro}','${O}','Otro')`);
    expect((await db.query<{ r: string }>(unir(O))).rows[0].r).toBe('ya_en_circulo');
  }, 60000);

  it('un nombre vacío o demasiado largo se rechaza', async () => {
    const { db, A } = await conInvitaciones();
    const N = await nuevaCuenta(db, 'n@x.com');
    await db.query(crear(A));
    expect((await db.query<{ r: string }>(unir(N, CODIGO, '   '))).rows[0].r).toBe('invalida');
    expect((await db.query<{ r: string }>(unir(N, CODIGO, 'x'.repeat(81)))).rows[0].r).toBe('invalida');
  }, 60000);

  it('anon y authenticated no ejecutan las funciones ni escriben invitaciones; solo el organizador las ve', async () => {
    const { db, A, B, X } = await conInvitaciones();
    await db.query(crear(A));
    for (const rol of ['anon', 'authenticated'] as const) {
      await como(db, rol, B, async () => {
        await expect(db.query(crear(B))).rejects.toThrow();
        await expect(db.query(unir(X))).rejects.toThrow();
        await expect(db.query(`select public.revocar_invitacion(gen_random_uuid(),'${B}')`)).rejects.toThrow();
      });
    }
    await como(db, 'authenticated', B, async () => {
      await expect(db.query(`insert into public.invitations(circle_id, code, expires_at) values ('${C}','BBBB-3333', now())`)).rejects.toThrow();
      await expect(db.query(`update public.invitations set revoked_at = null`)).rejects.toThrow();
    });
    await como(db, 'authenticated', A, async () => expect((await db.query(`select 1 from public.invitations`)).rows).toHaveLength(1));
    await como(db, 'authenticated', B, async () => expect((await db.query(`select 1 from public.invitations`)).rows).toHaveLength(0));
    await como(db, 'authenticated', X, async () => expect((await db.query(`select 1 from public.invitations`)).rows).toHaveLength(0));
    await como(db, 'service_role', null, async () => expect((await db.query(unir(X))).rows[0]).toEqual({ r: 'ok' }));
  }, 60000);
});
