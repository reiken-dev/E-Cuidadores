import { describe, expect, it } from 'vitest';
import { armarDatos, citaAFila, citaDeFila, dosisDeFila, esUuid, isoAMs, medAFila, medDeFila, miembroDeFila, msAIso, notaAFila, notaDeFila, perfilAColumnas, perfilDeFila, planDeSuscripcion, tonoDe } from './mapeo';
import type { FilaCirculo, FilaMed } from './mapeo';
import { doseKey } from '../schedule';
import { SELF_ID } from '../types';
import type { Appt, Med, Note } from '../types';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const MED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const circulo: FilaCirculo = {
  id: 'c1',
  patient_name: 'Rosa',
  patient_age: 78,
  relation: 'Mamá',
  allergies: ['Penicilina'],
  conditions: null,
  doctor_name: 'Dr. Ibarra',
  doctor_phone: '555-0142',
  emergency_name: 'Marta',
  emergency_phone: '555-0187',
  default_remind_day_before: true,
  default_remind_hours: 3,
  celebrated_milestones: ['racha-7'],
  questions: '¿Subimos la dosis?',
  allergies_at: '2026-11-01',
};

const filaMed: FilaMed = {
  id: MED,
  name: 'Losartán',
  dose: '50 mg',
  times: ['08:00', '20:00'],
  freq: { kind: 'daily' },
  notes: '',
  giver_id: U2,
  paused: false,
  start_at: '2026-10-01T12:00:00.000Z',
  schedule_from: null,
};

describe('ids y fechas', () => {
  it('reconoce un uuid y rechaza ids locales de la demostración', () => {
    expect(esUuid(U1)).toBe(true);
    expect(esUuid('carlos')).toBe(false);
    expect(esUuid(null)).toBe(false);
  });
  it('convierte milisegundos e ISO en ambos sentidos', () => {
    expect(isoAMs(msAIso(1736337600000))).toBe(1736337600000);
    expect(isoAMs(null)).toBeNull();
    expect(isoAMs('no es fecha')).toBeNull();
  });
  it('el color de una persona sale siempre del id y es uno de los cuatro tonos', () => {
    expect(tonoDe(U1)).toBe(tonoDe(U1));
    expect(['accent', 'indigo', 'green', 'amber']).toContain(tonoDe(U2));
  });
});

describe('círculo → perfil y ajustes', () => {
  it('traduce nombres de columnas y listas nulas', () => {
    expect(perfilDeFila(circulo)).toEqual({
      name: 'Rosa',
      age: 78,
      relation: 'Mamá',
      allergies: ['Penicilina'],
      allergiesAt: '2026-11-01',
      conditions: [],
      doctorName: 'Dr. Ibarra',
      doctorPhone: '555-0142',
      emergencyName: 'Marta',
      emergencyPhone: '555-0187',
    });
  });
  it('perfil → columnas es la ruta de vuelta, sin tocar created_by ni id', () => {
    const cols = perfilAColumnas(perfilDeFila(circulo));
    expect(cols).toMatchObject({ patient_name: 'Rosa', doctor_phone: '555-0142', allergies_at: '2026-11-01' });
    expect(cols).not.toHaveProperty('created_by');
    expect(cols).not.toHaveProperty('id');
  });
});

describe('medicinas', () => {
  it('fila → Med y de vuelta', () => {
    const med = medDeFila({ ...filaMed, schedule_from: '2026-11-10T10:00:00.000Z' });
    expect(med).toMatchObject({ id: MED, giverId: U2, startAt: Date.parse('2026-10-01T12:00:00.000Z'), scheduleFrom: Date.parse('2026-11-10T10:00:00.000Z') });
    const fila = medAFila(med, 'c1');
    expect(fila).toMatchObject({ circle_id: 'c1', giver_id: U2, start_at: '2026-10-01T12:00:00.000Z', schedule_from: '2026-11-10T10:00:00.000Z' });
  });
  it('sin schedule_from no inventa uno', () => {
    expect(medDeFila(filaMed)).not.toHaveProperty('scheduleFrom');
    expect(medAFila(medDeFila(filaMed), 'c1').schedule_from).toBeNull();
  });
  it('un responsable que no es un uuid real (id de la demostración) no viaja a la clave foránea', () => {
    const med: Med = { ...medDeFila(filaMed), giverId: 'carlos' };
    expect(medAFila(med, 'c1').giver_id).toBeNull();
  });
});

describe('dosis', () => {
  const fila = { med_id: MED, dose_date: '2026-11-14', dose_time: '08:00', given_by: U1, given_by_self: false, given_at: '2026-11-14T11:05:00.000Z', skipped_reason: null };
  it('la clave coincide con doseKey de lib/schedule.ts (así «la última gana» sigue funcionando)', () => {
    expect(dosisDeFila(fila).id).toBe(`d-${doseKey(MED, '2026-11-14', '08:00')}`);
  });
  it('dada por una persona, por el propio familiar y omitida con motivo', () => {
    expect(dosisDeFila(fila)).toMatchObject({ byId: U1, at: Date.parse('2026-11-14T11:05:00.000Z') });
    expect(dosisDeFila(fila)).not.toHaveProperty('skipped');
    expect(dosisDeFila({ ...fila, given_by_self: true }).byId).toBe(SELF_ID);
    expect(dosisDeFila({ ...fila, skipped_reason: 'olvido' }).skipped).toBe('olvido');
  });
  it('un motivo desconocido no se cuela y quien borró su cuenta no rompe el historial', () => {
    expect(dosisDeFila({ ...fila, skipped_reason: 'inventado' })).not.toHaveProperty('skipped');
    expect(dosisDeFila({ ...fila, given_by: null }).byId).toBe('ex-miembro');
  });
});

describe('citas y notas', () => {
  const cita: Appt = {
    id: 'a1', title: 'Control', specialist: 'Cardiología', date: '2026-11-19', time: '10:00', place: 'Clínica', attendeeId: U2,
    remindDayBefore: true, remindHoursBefore: 2, status: 'pendiente', result: '',
  };
  it('cita ida y vuelta', () => {
    const fila = citaAFila(cita, 'c1');
    expect(fila).toMatchObject({ circle_id: 'c1', appt_date: '2026-11-19', appt_time: '10:00', attendee_id: U2, remind_hours_before: 2 });
    expect(citaDeFila(fila)).toEqual(cita);
  });
  it('un estado raro de la base no rompe la app', () => {
    expect(citaDeFila({ ...citaAFila(cita, 'c1'), status: 'rara', remind_hours_before: 9 })).toMatchObject({ status: 'pendiente', remindHoursBefore: 3 });
  });
  it('la nota no envía autor: lo fija el servidor con la sesión', () => {
    const nota: Note = { id: 'n1', kind: 'animo', text: 'Hoy estuvo de buen ánimo', authorId: U1, at: 1736337600000 };
    const fila = notaAFila(nota, 'c1');
    expect(fila).toEqual({ id: 'n1', circle_id: 'c1', kind: 'animo', body: 'Hoy estuvo de buen ánimo', created_at: msAIso(1736337600000) });
    expect(fila).not.toHaveProperty('author_id');
    expect(fila).not.toHaveProperty('author_name');
    expect(notaDeFila({ id: 'n1', kind: 'animo', body: 'x', author_id: U1, created_at: msAIso(5) })).toMatchObject({ text: 'x', authorId: U1, at: 5 });
    expect(notaDeFila({ id: 'n2', kind: 'rara', body: 'x', author_id: null, created_at: msAIso(5) })).toMatchObject({ kind: 'otra', authorId: 'ex-miembro' });
  });
});

describe('plan', () => {
  const AHORA = Date.parse('2026-11-14T12:00:00.000Z');
  const futuro = msAIso(AHORA + 864e5);
  const pasado = msAIso(AHORA - 864e5);
  it('trial y activa se muestran como activas', () => {
    for (const status of ['trial', 'active']) expect(planDeSuscripcion({ status, plan: 'anual', updated_at: msAIso(7) }, AHORA)).toEqual({ estado: 'activo', tipo: 'anual', desde: 7 });
  });
  it('una cancelada solo está al día hasta el fin de lo ya pagado (como la base); sin fecha, no', () => {
    expect(planDeSuscripcion({ status: 'canceled', plan: 'mensual', updated_at: msAIso(7), current_period_end: futuro }, AHORA).estado).toBe('activo');
    expect(planDeSuscripcion({ status: 'canceled', plan: 'mensual', updated_at: msAIso(7), current_period_end: pasado }, AHORA)).toMatchObject({ estado: 'pago_pendiente', motivo: 'inactiva' });
    expect(planDeSuscripcion({ status: 'canceled', plan: 'mensual', updated_at: msAIso(7) }, AHORA)).toMatchObject({ estado: 'pago_pendiente', motivo: 'inactiva' });
  });
  it('no se pudo cobrar (past_due) conserva el acceso: motivo «cobro»; vencida, reembolso y contracargo: «inactiva»', () => {
    expect(planDeSuscripcion({ status: 'past_due', plan: 'mensual', updated_at: msAIso(7) }, AHORA)).toMatchObject({ estado: 'pago_pendiente', motivo: 'cobro' });
    for (const status of ['expired', 'refunded', 'chargeback']) expect(planDeSuscripcion({ status, plan: 'mensual', updated_at: msAIso(7) }, AHORA)).toMatchObject({ estado: 'pago_pendiente', motivo: 'inactiva' });
  });
  it('sin fila de suscripción propia (p. ej. un hermano que no paga) no se muestra un aviso de cobro ajeno', () => {
    expect(planDeSuscripcion(null).estado).toBe('activo');
  });
});

describe('armarDatos', () => {
  it('arma el estado completo con quien tiene la sesión como usuario actual', () => {
    const ahora = Date.parse('2026-11-14T15:00:00.000Z');
    const d = armarDatos({
      circulo,
      miembros: [{ user_id: U1, name: 'Ana', role: 'Organizador', last_seen_at: '2026-11-13T10:00:00.000Z' }, { user_id: U2, name: 'Bea', role: null, last_seen_at: null }],
      meds: [filaMed],
      dosis: [],
      citas: [],
      notas: [],
      suscripcion: { status: 'active', plan: 'mensual', updated_at: msAIso(ahora) },
      userId: U1,
      simpleMode: true,
      ahora,
    });
    expect(d).toMatchObject({ version: 1, demo: false, currentUserId: U1, organizerName: 'Ana', questions: '¿Subimos la dosis?', hitos: ['racha-7'], lastSeenAt: Date.parse('2026-11-13T10:00:00.000Z') });
    expect(d.members.map((m) => m.name)).toEqual(['Ana', 'Bea']);
    expect(d.members[1].role).toBe('');
    expect(d.settings).toEqual({ defaultRemindDayBefore: true, defaultRemindHours: 3, simpleMode: true });
    expect(d.meds).toHaveLength(1);
    expect(d.plan.estado).toBe('activo');
    expect(miembroDeFila({ user_id: U1, name: 'Ana', role: null, last_seen_at: null }).id).toBe(U1);
  });
  it('nunca marca los datos reales como de ejemplo', () => {
    const d = armarDatos({ circulo, miembros: [], meds: [], dosis: [], citas: [], notas: [], suscripcion: null, userId: U1, simpleMode: false, ahora: 0 });
    expect(d.demo).toBe(false);
    expect(d.organizerName).toBe('');
  });
});
