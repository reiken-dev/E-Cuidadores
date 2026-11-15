import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cargarCirculo, crearCirculo, escribir } from './remoto';
import type { Contexto } from './remoto';
import type { Appt, Med, Note, Profile } from '../types';

const U1 = '11111111-1111-4111-8111-111111111111';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type Resp = { data?: unknown; error?: { code?: string } | null };
type Llamada = { tabla?: string; metodo: string; args: unknown[] };

/** Cliente falso con el mismo encadenado que supabase-js. Responde por «tabla.operación» (select, upsert, update, delete, insert). */
function fakeDb(respuestas: Record<string, Resp | ((l: Llamada[]) => Resp)> = {}, rpcResp: Resp = { error: null }, authResp: Resp = { error: null }) {
  const llamadas: Llamada[] = [];
  const db = {
    from(tabla: string) {
      const propias: Llamada[] = [];
      let op = 'select';
      const b: Record<string, unknown> = {};
      for (const metodo of ['select', 'eq', 'gte', 'order', 'limit', 'range', 'upsert', 'update', 'delete', 'insert', 'maybeSingle', 'single']) {
        b[metodo] = (...args: unknown[]) => {
          const l = { tabla, metodo, args };
          llamadas.push(l);
          propias.push(l);
          if (['upsert', 'update', 'delete', 'insert'].includes(metodo)) op = metodo;
          return b;
        };
      }
      b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
        const r = respuestas[`${tabla}.${op}`];
        const v = typeof r === 'function' ? r(propias) : r;
        return Promise.resolve({ data: null, error: null, ...(v ?? {}) }).then(res, rej);
      };
      return b;
    },
    rpc: async (nombre: string, args: unknown) => {
      llamadas.push({ metodo: `rpc:${nombre}`, args: [args] });
      return { data: null, ...rpcResp };
    },
    auth: {
      updateUser: async (datos: unknown) => {
        llamadas.push({ metodo: 'auth.updateUser', args: [datos] });
        return { data: null, ...authResp };
      },
    },
  };
  return { db: db as unknown as SupabaseClient, llamadas };
}
const ctx = (db: SupabaseClient): Contexto => ({ db, circleId: C, userId: U1 });

const filaCirculo = {
  id: C, patient_name: 'Rosa', patient_age: 78, relation: 'Mamá', allergies: [], conditions: [], doctor_name: '', doctor_phone: '', emergency_name: '', emergency_phone: '',
  default_remind_day_before: true, default_remind_hours: 3, celebrated_milestones: [], questions: '', allergies_at: null,
};
const filaMed = { id: MED, name: 'Losartán', dose: '50 mg', times: ['08:00'], freq: { kind: 'daily' }, notes: '', giver_id: null, paused: false, start_at: '2026-10-01T12:00:00.000Z', schedule_from: null };

describe('cargarCirculo', () => {
  const base: Record<string, Resp> = {
    'circles.select': { data: [filaCirculo] },
    'members.select': { data: [{ user_id: U1, name: 'Ana', role: 'Organizador', last_seen_at: null }] },
    'meds.select': { data: [filaMed] },
    'dose_logs.select': { data: [] },
    'appointments.select': { data: [] },
    'notes.select': { data: [] },
    'subscriptions.select': { data: { status: 'active', plan: 'mensual', updated_at: '2026-11-01T00:00:00.000Z' } },
  };

  it('sin círculo devuelve null', async () => {
    const { db } = fakeDb({ ...base, 'circles.select': { data: [] } });
    expect(await cargarCirculo(db, U1)).toBeNull();
  });
  it('arma el estado con lo que RLS le dejó ver', async () => {
    const { db } = fakeDb(base);
    const r = await cargarCirculo(db, U1, { ahora: Date.parse('2026-11-14T12:00:00.000Z') });
    expect(r?.circleId).toBe(C);
    expect(r?.datos).toMatchObject({ demo: false, currentUserId: U1, organizerName: 'Ana' });
    expect(r?.datos.meds).toHaveLength(1);
    expect(r?.datos.plan.estado).toBe('activo');
  });
  it('trae solo las dosis de los últimos 120 días y siempre filtra por círculo', async () => {
    const { db, llamadas } = fakeDb(base);
    await cargarCirculo(db, U1, { ahora: Date.parse('2026-11-14T12:00:00.000Z') });
    const gte = llamadas.find((l) => l.tabla === 'dose_logs' && l.metodo === 'gte');
    expect(gte?.args).toEqual(['dose_date', '2026-07-17']);
    for (const t of ['members', 'meds', 'dose_logs', 'appointments', 'notes']) {
      expect(llamadas.some((l) => l.tabla === t && l.metodo === 'eq' && l.args[0] === 'circle_id' && l.args[1] === C)).toBe(true);
    }
  });
  it('pagina: con más de 1000 dosis pide la segunda página', async () => {
    const dosis = (n: number) => Array.from({ length: n }, (_, i) => ({ med_id: MED, dose_date: '2026-11-01', dose_time: '08:00', given_by: U1, given_by_self: false, given_at: '2026-11-01T12:00:00.000Z', skipped_reason: i === 0 ? null : null }));
    const { db, llamadas } = fakeDb({
      ...base,
      'dose_logs.select': (l) => {
        const rango = l.find((x) => x.metodo === 'range')?.args as number[];
        return { data: rango[0] === 0 ? dosis(1000) : dosis(5) };
      },
    });
    const r = await cargarCirculo(db, U1);
    expect(r?.datos.doses).toHaveLength(1005);
    expect(llamadas.filter((l) => l.tabla === 'dose_logs' && l.metodo === 'range').map((l) => l.args)).toEqual([[0, 999], [1000, 1999]]);
  });
  it('si algo falla, lanza sin devolver datos a medias', async () => {
    await expect(cargarCirculo(fakeDb({ ...base, 'notes.select': { error: { code: 'XX000' } } }).db, U1)).rejects.toThrow();
    await expect(cargarCirculo(fakeDb({ ...base, 'circles.select': { error: { code: 'XX000' } } }).db, U1)).rejects.toThrow();
    await expect(cargarCirculo(fakeDb({ ...base, 'subscriptions.select': { error: { code: 'XX000' } } }).db, U1)).rejects.toThrow();
  });
});

describe('escribir', () => {
  const med: Med = { id: MED, name: 'Losartán', dose: '50 mg', times: ['08:00'], freq: { kind: 'daily' }, notes: '', giverId: null, paused: false, startAt: 1736337600000 };
  const cita: Appt = { id: 'a1', title: 'Control', specialist: '', date: '2026-11-19', time: '10:00', place: '', attendeeId: null, remindDayBefore: true, remindHoursBefore: 0, status: 'pendiente', result: '' };
  const nota: Note = { id: 'n1', kind: 'otra', text: 'Dormió bien', authorId: U1, at: 1736337600000 };

  it('medicina, cita y nota se guardan con upsert sobre su id, con el círculo y sin autor en la nota', async () => {
    const { db, llamadas } = fakeDb();
    expect(await escribir.guardarMed(ctx(db), med)).toEqual({ ok: true });
    expect(await escribir.guardarCita(ctx(db), cita)).toEqual({ ok: true });
    expect(await escribir.guardarNota(ctx(db), nota)).toEqual({ ok: true });
    const ups = llamadas.filter((l) => l.metodo === 'upsert');
    expect(ups.map((u) => u.tabla)).toEqual(['meds', 'appointments', 'notes']);
    for (const u of ups) expect(u.args[1]).toEqual({ onConflict: 'id' });
    for (const u of ups) expect(u.args[0]).toMatchObject({ circle_id: C });
    expect(ups[2].args[0]).not.toHaveProperty('author_id');
  });
  it('borrar usa id y círculo', async () => {
    const { db, llamadas } = fakeDb();
    await escribir.borrarMed(ctx(db), MED);
    await escribir.borrarNota(ctx(db), 'n1');
    expect(llamadas.filter((l) => l.metodo === 'eq').map((l) => `${l.tabla}:${l.args[0]}`)).toEqual(['meds:id', 'meds:circle_id', 'notes:id', 'notes:circle_id']);
  });
  it('registrar una dosis llama a la función de la base con el círculo y sin quién la dio (lo fija el servidor)', async () => {
    const { db, llamadas } = fakeDb();
    await escribir.registrarDosis(ctx(db), { medId: MED, date: '2026-11-14', time: '08:00', skipped: 'olvido', bySelf: false });
    expect(llamadas[0]).toMatchObject({ metodo: 'rpc:registrar_dosis', args: [{ c: C, m: MED, d: '2026-11-14', t: '08:00', skipped: 'olvido', by_self: false }] });
    expect(JSON.stringify(llamadas[0].args)).not.toContain('given_by');
  });
  it('borrar o deshacer sin ninguna fila afectada tampoco es un éxito (círculo de solo lectura o ya no existe)', async () => {
    const d = { medId: MED, date: '2026-11-14', time: '08:00' };
    expect(await escribir.borrarMed(ctx(fakeDb({ 'meds.delete': { data: [] } }).db), MED)).toEqual({ ok: false, codigo: 'sin-efecto' });
    expect(await escribir.borrarNota(ctx(fakeDb({ 'notes.delete': { data: [] } }).db), 'n1')).toEqual({ ok: false, codigo: 'sin-efecto' });
    expect(await escribir.deshacerDosis(ctx(fakeDb({ 'dose_logs.delete': { data: [] } }).db), d)).toEqual({ ok: false, codigo: 'sin-efecto' });
    expect(await escribir.borrarMed(ctx(fakeDb({ 'meds.delete': { data: [{ id: MED }] } }).db), MED)).toEqual({ ok: true });
    expect(await escribir.borrarNota(ctx(fakeDb({ 'notes.delete': { data: [{ id: 'n1' }] } }).db), 'n1')).toEqual({ ok: true });
    expect(await escribir.deshacerDosis(ctx(fakeDb({ 'dose_logs.delete': { data: [{ med_id: MED }] } }).db), d)).toEqual({ ok: true });
    expect(await escribir.borrarMed(ctx(fakeDb({ 'meds.delete': { error: { code: '42501' } } }).db), MED)).toEqual({ ok: false, codigo: 'permiso' });
  });
  it('deshacer una dosis borra por círculo, medicina, día y hora', async () => {
    const { db, llamadas } = fakeDb();
    await escribir.deshacerDosis(ctx(db), { medId: MED, date: '2026-11-14', time: '08:00' });
    expect(llamadas.filter((l) => l.metodo === 'eq').map((l) => l.args)).toEqual([['circle_id', C], ['med_id', MED], ['dose_date', '2026-11-14'], ['dose_time', '08:00']]);
  });
  it('un error 42501 (RLS) es «permiso»; una regla de la base (23514, 22001, 22P02, 23502) es «invalido»; cualquier otro, «otro»', async () => {
    expect(await escribir.guardarMed(ctx(fakeDb({ 'meds.upsert': { error: { code: '42501' } } }).db), med)).toEqual({ ok: false, codigo: 'permiso' });
    for (const code of ['23514', '22001', '22P02', '23502']) {
      expect(await escribir.guardarMed(ctx(fakeDb({ 'meds.upsert': { error: { code } } }).db), med)).toEqual({ ok: false, codigo: 'invalido' });
    }
    expect(await escribir.guardarMed(ctx(fakeDb({ 'meds.upsert': { error: { code: 'XX000' } } }).db), med)).toEqual({ ok: false, codigo: 'otro' });
    expect(await escribir.registrarDosis(ctx(fakeDb({}, { error: { code: '42501' } }).db), { medId: MED, date: '2026-11-14', time: '08:00', skipped: null, bySelf: false })).toEqual({ ok: false, codigo: 'permiso' });
  });
  it('una actualización que no cambia ninguna fila NO es un éxito (RLS la oculta sin error): «sin-efecto»', async () => {
    const perfil: Profile = { name: 'Rosa', age: 78, relation: 'Mamá', allergies: [], conditions: [], doctorName: '', doctorPhone: '', emergencyName: '', emergencyPhone: '' };
    expect(await escribir.actualizarPerfil(ctx(fakeDb({ 'circles.update': { data: [] } }).db), perfil)).toEqual({ ok: false, codigo: 'sin-efecto' });
    expect(await escribir.actualizarPerfil(ctx(fakeDb({ 'circles.update': { data: [{ id: C }] } }).db), perfil)).toEqual({ ok: true });
    expect(await escribir.actualizarPreguntas(ctx(fakeDb({ 'circles.update': { data: [] } }).db), 'x')).toEqual({ ok: false, codigo: 'sin-efecto' });
    expect(await escribir.actualizarHitos(ctx(fakeDb({ 'circles.update': { data: [{ id: C }] } }).db), ['racha-7'])).toEqual({ ok: true });
  });
  it('las preguntas tienen tope de 2000 caracteres y la visita solo toca la fila propia', async () => {
    const { db, llamadas } = fakeDb({ 'circles.update': { data: [{ id: C }] }, 'members.update': { data: [{ user_id: U1 }] } });
    await escribir.actualizarPreguntas(ctx(db), 'x'.repeat(2500));
    expect((llamadas.find((l) => l.tabla === 'circles' && l.metodo === 'update')?.args[0] as { questions: string }).questions).toHaveLength(2000);
    await escribir.actualizarVisita(ctx(db), 1736337600000);
    const eqs = llamadas.filter((l) => l.tabla === 'members' && l.metodo === 'eq').map((l) => l.args);
    expect(eqs).toEqual([['circle_id', C], ['user_id', U1]]);
  });
});

describe('crearCirculo', () => {
  const datos = { nombreFamiliar: ' Rosa ', parentesco: 'Mamá', tuNombre: ' Ana ', primeraMed: { name: 'Losartán', time: '08:00' } };

  it('guarda tu nombre para el trigger, crea el círculo a tu nombre y la primera medicina', async () => {
    const { db, llamadas } = fakeDb({ 'circles.insert': { data: { id: C } } });
    expect(await crearCirculo(db, U1, datos)).toEqual({ ok: true, circleId: C });
    expect(llamadas[0]).toMatchObject({ metodo: 'auth.updateUser', args: [{ data: { name: 'Ana' } }] });
    expect(llamadas.find((l) => l.tabla === 'circles' && l.metodo === 'insert')?.args[0]).toEqual({ created_by: U1, patient_name: 'Rosa', relation: 'Mamá' });
    expect(llamadas.find((l) => l.tabla === 'meds' && l.metodo === 'insert')?.args[0]).toMatchObject({ circle_id: C, name: 'Losartán', times: ['08:00'], freq: { kind: 'daily' } });
  });
  it('sin medicina, no inserta ninguna', async () => {
    const { db, llamadas } = fakeDb({ 'circles.insert': { data: { id: C } } });
    await crearCirculo(db, U1, { ...datos, primeraMed: null });
    expect(llamadas.some((l) => l.tabla === 'meds')).toBe(false);
  });
  it('sin suscripción vigente la base lo rechaza (42501) y se explica con un código propio', async () => {
    const { db } = fakeDb({ 'circles.insert': { error: { code: '42501' } } });
    expect(await crearCirculo(db, U1, datos)).toEqual({ ok: false, codigo: 'sin-suscripcion' });
  });
  it('otros fallos no se confunden con falta de suscripción', async () => {
    expect(await crearCirculo(fakeDb({ 'circles.insert': { error: { code: 'XX000' } } }).db, U1, datos)).toEqual({ ok: false, codigo: 'otro' });
    expect(await crearCirculo(fakeDb({}, { error: null }, { error: { code: 'x' } }).db, U1, datos)).toEqual({ ok: false, codigo: 'otro' });
  });
  it('si falla solo la medicina, el círculo ya existe y se informa éxito', async () => {
    const { db } = fakeDb({ 'circles.insert': { data: { id: C } } });
    const conErrorEnMed = fakeDb({ 'circles.insert': { data: { id: C } }, 'meds.insert': { error: { code: 'XX000' } } });
    expect(await crearCirculo(conErrorEnMed.db, U1, datos)).toEqual({ ok: true, circleId: C });
    expect(db).toBeTruthy();
  });
  it('sin tu nombre no toca los datos de la cuenta (el trigger usa «Organizador»)', async () => {
    const { db, llamadas } = fakeDb({ 'circles.insert': { data: { id: C } } });
    await crearCirculo(db, U1, { ...datos, tuNombre: '   ' });
    expect(llamadas.some((l) => l.metodo === 'auth.updateUser')).toBe(false);
  });
});
