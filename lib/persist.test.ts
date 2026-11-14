import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, parseStored } from './persist';
import { appt, data, dose, med, note } from './test-utils';

const base = data();
const guardar = (obj: unknown) => JSON.stringify(obj);

describe('parseStored: lo guardado nunca rompe la app', () => {
  it('sin nada guardado devuelve null', () => {
    expect(parseStored(null, base)).toBeNull();
    expect(parseStored('', base)).toBeNull();
  });
  it('texto que no es JSON devuelve null', () => {
    expect(parseStored('{esto no es json', base)).toBeNull();
    expect(parseStored('<html>', base)).toBeNull();
  });
  it('JSON que no es un objeto de datos devuelve null', () => {
    for (const raw of ['null', '42', '"hola"', '[]', '[1,2]', 'true']) expect(parseStored(raw, base)).toBeNull();
  });
  it('de otra versión (más nueva, más vieja o sin versión) devuelve null', () => {
    expect(parseStored(guardar({ ...base, version: 2 }), base)).toBeNull();
    expect(parseStored(guardar({ ...base, version: 0 }), base)).toBeNull();
    expect(parseStored(guardar({ ...base, version: '1' }), base)).toBeNull();
    const { version, ...sinVersion } = base;
    void version;
    expect(parseStored(guardar(sinVersion), base)).toBeNull();
  });
  it('faltan piezas esenciales: devuelve null', () => {
    expect(parseStored(guardar({ version: 1 }), base)).toBeNull();
    expect(parseStored(guardar({ ...base, meds: 'nada' }), base)).toBeNull();
    expect(parseStored(guardar({ ...base, profile: null }), base)).toBeNull();
    expect(parseStored(guardar({ ...base, members: [] }), base)).toBeNull();
    expect(parseStored(guardar({ ...base, members: [{ id: 5 }] }), base)).toBeNull();
  });
  it('datos correctos vuelven idénticos', () => {
    const completo = data({
      doses: [dose('m1', '2026-09-24', '08:00', 'carlos', 123)],
      appts: [appt()],
      notes: [note({ at: 50 })],
      questions: 'Una pregunta',
    });
    const r = parseStored(guardar(completo), base);
    expect(r).toEqual(completo);
    expect(r?.version).toBe(CURRENT_VERSION);
  });
});

describe('parseStored: piezas dañadas se descartan, el resto se conserva', () => {
  it('descarta medicinas sin horarios válidos, sin nombre o con frecuencia rota', () => {
    const r = parseStored(
      guardar({
        ...base,
        meds: [
          med(),
          { ...med({ id: 'x1' }), times: [] },
          { ...med({ id: 'x2' }), times: ['25:99', 'abc'] },
          { ...med({ id: 'x3' }), name: '' },
          { ...med({ id: 'x4' }), freq: { kind: 'cada-luna' } },
          { ...med({ id: 'x5' }), freq: { kind: 'weekdays', days: [] } },
          { ...med({ id: 'x6' }), freq: { kind: 'interval', every: 0, anchor: '2026-09-01' } },
          'basura',
          null,
        ],
      }),
      base
    );
    expect(r?.meds.map((m) => m.id)).toEqual(['m1']);
  });
  it('en una medicina quita solo los horarios inválidos', () => {
    const r = parseStored(guardar({ ...base, meds: [{ ...med(), times: ['08:00', 'mañana', '20:30'] }] }), base);
    expect(r?.meds[0].times).toEqual(['08:00', '20:30']);
  });
  it('una medicina sin fecha de inicio recibe una (para no exigir dosis viejas)', () => {
    const sinInicio: Record<string, unknown> = { ...med() };
    delete sinInicio.startAt;
    const r = parseStored(guardar({ ...base, meds: [sinInicio] }), base);
    expect(typeof r?.meds[0].startAt).toBe('number');
    expect(r?.meds[0].startAt).toBeGreaterThan(0);
  });
  it('descarta dosis, citas y notas con campos inválidos', () => {
    const r = parseStored(
      guardar({
        ...base,
        doses: [dose('m1', '2026-09-24', '08:00', 'carlos', 1), { ...dose('m1', 'ayer', '08:00'), at: 1 }, { ...dose('m1', '2026-09-24', '08:00'), byId: '' }, { medId: 'm1' }],
        appts: [appt(), { ...appt({ id: 'b' }), date: 'pronto' }, { ...appt({ id: 'c' }), time: '9am' }, 7],
        notes: [note({ id: 'ok' }), { ...note({ id: 'mal' }), at: 'hoy' }, { ...note({ id: 'sin' }), text: undefined }],
      }),
      base
    );
    expect(r?.doses).toHaveLength(1);
    expect(r?.appts.map((a) => a.id)).toEqual(['a1']);
    expect(r?.notes.map((n) => n.id)).toEqual(['ok']);
  });
  it('corrige valores fuera de rango con los valores seguros', () => {
    const r = parseStored(
      guardar({
        ...base,
        appts: [{ ...appt(), status: 'rara', remindHoursBefore: 9 }],
        notes: [{ ...note(), kind: 'inventada' }],
        profile: { ...base.profile, age: 500, allergies: ['Penicilina', 5, null] },
        settings: { defaultRemindDayBefore: 'sí', defaultRemindHours: 99 },
      }),
      base
    );
    expect(r?.appts[0].status).toBe('pendiente');
    expect(r?.appts[0].remindHoursBefore).toBe(0);
    expect(r?.notes[0].kind).toBe('otra');
    expect(r?.profile.age).toBeNull();
    expect(r?.profile.allergies).toEqual(['Penicilina']);
    expect(r?.settings.defaultRemindDayBefore).toBe(base.settings.defaultRemindDayBefore);
    expect(r?.settings.defaultRemindHours).toBe(base.settings.defaultRemindHours);
  });
  it('la fecha de registro de las alergias solo se acepta si es una fecha y hay alergias', () => {
    const conFecha = parseStored(guardar({ ...base, profile: { ...base.profile, allergiesAt: '2026-09-10' } }), base);
    expect(conFecha?.profile.allergiesAt).toBe('2026-09-10');
    const basura = parseStored(guardar({ ...base, profile: { ...base.profile, allergiesAt: 'ayer' } }), base);
    expect(basura?.profile.allergiesAt).toBeUndefined(); // sin fecha válida: "no registrada"
    const sinLista = parseStored(guardar({ ...base, profile: { ...base.profile, allergies: [], allergiesAt: '2026-09-10' } }), base);
    expect(sinLista?.profile.allergiesAt).toBeUndefined();
    const anterior = parseStored(guardar({ ...base, profile: { ...base.profile, allergiesAt: undefined } }), base);
    expect(anterior?.profile.allergiesAt).toBeUndefined();
  });
  it('si el usuario actual ya no existe, usa al primer miembro', () => {
    const r = parseStored(guardar({ ...base, currentUserId: 'fantasma' }), base);
    expect(r?.currentUserId).toBe('carlos');
  });
  it('el nombre del familiar vacío vuelve al de respaldo', () => {
    const r = parseStored(guardar({ ...base, profile: { ...base.profile, name: '   ' } }), base);
    expect(r?.profile.name).toBe('Rosa');
  });
  it('el modo simple NUNCA se restaura al abrir la app', () => {
    const r = parseStored(guardar({ ...base, settings: { ...base.settings, simpleMode: true } }), base);
    expect(r?.settings.simpleMode).toBe(false);
  });
});

describe('parseStored: topes de largo, repetidos y opciones del ejemplo (auditoría final)', () => {
  const HUGE = 'X'.repeat(5000);
  it('recorta textos larguísimos para que no rompan pantallas ni llenen el almacenamiento', () => {
    const r = parseStored(
      guardar({
        ...base,
        profile: { ...base.profile, name: HUGE, doctorName: HUGE, doctorPhone: HUGE },
        meds: [{ ...med(), name: HUGE, dose: HUGE, notes: HUGE }],
        appts: [{ ...appt(), title: HUGE, place: HUGE, result: HUGE }],
        notes: [{ ...note(), text: HUGE }],
        questions: HUGE,
      }),
      base
    );
    expect(r?.profile.name.length).toBe(80);
    expect(r?.profile.doctorName.length).toBe(80);
    expect(r?.profile.doctorPhone.length).toBe(30);
    expect(r?.meds[0].name.length).toBe(80);
    expect(r?.meds[0].dose.length).toBe(80);
    expect(r?.meds[0].notes.length).toBe(300);
    expect(r?.appts[0].title.length).toBe(120);
    expect(r?.appts[0].place.length).toBe(160);
    expect(r?.appts[0].result.length).toBe(700);
    expect(r?.notes[0].text.length).toBe(600);
    expect(r?.questions.length).toBe(800);
  });
  it('quita ids repetidos (la primera gana) para no duplicar tarjetas', () => {
    const r = parseStored(
      guardar({ ...base, meds: [med({ name: 'Uno' }), med({ name: 'Dos' })], notes: [note({ text: 'a' }), note({ text: 'b' })] }),
      base
    );
    expect(r?.meds).toHaveLength(1);
    expect(r?.meds[0].name).toBe('Uno');
    expect(r?.notes).toHaveLength(1);
  });
  it('alergias y condiciones: sin vacíos ni repetidos y con tope', () => {
    const muchas = Array.from({ length: 100 }, (_, i) => `Alergia ${i}`);
    const r = parseStored(
      guardar({ ...base, profile: { ...base.profile, allergies: ['Penicilina', ' Penicilina ', '', '   ', ...muchas], conditions: [HUGE] } }),
      base
    );
    expect(r?.profile.allergies[0]).toBe('Penicilina');
    expect(r?.profile.allergies.filter((a) => a === 'Penicilina')).toHaveLength(1);
    expect(r?.profile.allergies).toHaveLength(30);
    expect(r?.profile.conditions[0].length).toBe(60);
  });
  it('opciones del ejemplo: solo valores con sentido (no crea 1000 hermanos ni horas inválidas)', () => {
    const r = parseStored(
      guardar({ ...base, seedOptions: { name: HUGE, members: 1000000, firstMed: { name: 'X', time: '99:99' }, relation: 5 } }),
      base
    );
    expect(r?.seedOptions.name?.length).toBe(80);
    expect(r?.seedOptions.members).toBeUndefined();
    expect(r?.seedOptions.firstMed).toBeUndefined();
    expect(r?.seedOptions.relation).toBeUndefined();
    const ok = parseStored(guardar({ ...base, seedOptions: { members: 3, firstMed: { name: 'Losartán', time: '08:00' } } }), base);
    expect(ok?.seedOptions).toEqual({ members: 3, firstMed: { name: 'Losartán', time: '08:00' } });
  });
});

describe('parseStored: código de invitación', () => {
  it('conserva un código con forma válida y descarta el que no la tiene', () => {
    expect(parseStored(guardar({ ...base, codigoCirculo: 'K7QD-3MPX' }), base)?.codigoCirculo).toBe('K7QD-3MPX');
    expect(parseStored(guardar({ ...base, codigoCirculo: 'ROSA-4F9K' }), base)?.codigoCirculo).toBeUndefined();
    expect(parseStored(guardar(base), base)?.codigoCirculo).toBeUndefined();
  });
});

describe('parseStored: campos de retención', () => {
  it('datos antiguos sin hitos, visita ni plan se completan con valores seguros', () => {
    const { lastSeenAt, hitos, plan, ...antiguo } = base;
    void lastSeenAt; void hitos; void plan;
    const r = parseStored(guardar(antiguo), base)!;
    expect(r.lastSeenAt).toBe(0);
    expect(r.hitos).toEqual([]);
    expect(r.plan).toMatchObject({ estado: 'activo', tipo: 'mensual' });
  });
  it('un plan o un motivo inventados se corrigen', () => {
    const raro = { ...base, plan: { estado: 'hackeado', tipo: 'gratis', desde: 'ayer' }, hitos: ['ok', 7, null] };
    const r = parseStored(guardar(raro), base)!;
    expect(r.plan.estado).toBe('activo');
    expect(r.plan.tipo).toBe('mensual');
    expect(r.hitos).toEqual(['ok']);
  });
  it('una dosis anotada como no dada conserva su motivo y descarta motivos falsos', () => {
    const buenas = { ...dose('m1', '2026-09-24', '08:00', 'carlos', 5), skipped: 'rechazo' };
    const falsas = { ...dose('m1', '2026-09-23', '08:00', 'carlos', 5), skipped: 'otra-cosa' };
    const r = parseStored(guardar({ ...base, doses: [buenas, falsas] }), base)!;
    expect(r.doses.find((d) => d.date === '2026-09-24')?.skipped).toBe('rechazo');
    expect(r.doses.find((d) => d.date === '2026-09-23')?.skipped).toBeUndefined();
  });
});
