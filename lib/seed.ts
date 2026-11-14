// Datos de ejemplo realistas para la demostración. Las fechas son RELATIVAS a hoy para que la
// demo siempre se vea vigente. Sin números ni correos reales: los teléfonos son ficticios.

import { addDays, keyFromMs, weekday } from './dates';
import { doseKey, scheduledOn } from './schedule';
import type { Appt, AppData, DoseLog, Med, Member, Note, SeedOptions } from './types';

const HORA = 3600000;
const DIA = 86400000;

const TODOS: Member[] = [
  { id: 'carlos', name: 'Carlos', role: 'Vive cerca y lleva las medicinas', tone: 'accent' },
  { id: 'marta', name: 'Marta', role: 'Acompaña a las citas médicas', tone: 'indigo' },
  { id: 'ana', name: 'Ana', role: 'Vive en otra ciudad y llama cada noche', tone: 'green' },
  { id: 'luis', name: 'Luis', role: 'Se encarga de la farmacia y las compras', tone: 'amber' },
];

/** Número pseudo-aleatorio estable (0 a 1) a partir de un texto: la demo se ve igual en cada carga. */
function rnd(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function buildSeed(nowMs: number, opts: SeedOptions = {}): AppData {
  const today = keyFromMs(nowMs);
  const name = opts.name?.trim() || 'Rosa';
  const relation = opts.relation || 'Mamá';
  const count = Math.min(Math.max(opts.members ?? 3, 1), TODOS.length);
  const members = TODOS.slice(0, count);
  const pick = (id: string) => (members.some((m) => m.id === id) ? id : members[0].id);
  const startAt = nowMs - 35 * DIA;

  const meds: Med[] = [];
  if (opts.firstMed) {
    meds.push({
      id: 'med-primera',
      name: opts.firstMed.name,
      dose: 'Según receta',
      times: [opts.firstMed.time],
      freq: { kind: 'daily' },
      notes: '',
      giverId: pick('carlos'),
      paused: false,
      startAt: nowMs,
    });
  }
  meds.push(
    {
      id: 'med-losartan',
      name: 'Losartán',
      dose: '50 mg',
      times: ['08:00'],
      freq: { kind: 'daily' },
      notes: '',
      giverId: pick('carlos'),
      paused: false,
      startAt,
    },
    {
      id: 'med-metformina',
      name: 'Metformina',
      dose: '850 mg',
      times: ['14:00'],
      freq: { kind: 'daily' },
      notes: '',
      giverId: pick('marta'),
      paused: false,
      startAt,
    },
    {
      id: 'med-atorvastatina',
      name: 'Atorvastatina',
      dose: '20 mg',
      times: ['21:00'],
      freq: { kind: 'weekdays', days: [1, 3, 5] },
      notes: '',
      giverId: pick('carlos'),
      paused: false,
      startAt,
    }
  );

  // Historial de dosis de las últimas 4 semanas (alimenta la adherencia del resumen médico).
  const doses: DoseLog[] = [];
  for (const med of meds) {
    if (med.id === 'med-primera') continue;
    for (let i = 28; i >= 0; i--) {
      const k = addDays(today, -i);
      if (!scheduledOn(med, k)) continue;
      for (const time of med.times) {
        const [h, m] = time.split(':').map(Number);
        const d = new Date(nowMs);
        d.setDate(d.getDate() - i);
        d.setHours(h, m, 0, 0);
        const at = d.getTime();
        if (at > nowMs) continue;
        const key = doseKey(med.id, k, time);
        const reciente = i === 0 && at > nowMs - 90 * 60000; // deja pendiente lo que acaba de tocar
        if (reciente) continue;
        // Las faltas quedan lejos de hoy: la demo muestra una racha de ~12 días (y una dosis anotada como no dada).
        const faltó = i > 12 && rnd(key) < 0.08;
        if (faltó) {
          if (rnd(key + 'o') < 0.5) {
            doses.push({ id: `d-${key}`, medId: med.id, date: k, time, byId: pick('carlos'), at: at + 40 * 60000, skipped: 'olvido' });
          }
          continue;
        }
        const usual = med.giverId ?? members[0].id;
        const quien = rnd(key + 'g') < 0.7 ? usual : members[Math.floor(rnd(key + 'h') * members.length)].id;
        doses.push({
          id: `d-${key}`,
          medId: med.id,
          date: k,
          time,
          byId: quien,
          at: at + Math.floor(rnd(key + 't') * 25) * 60000,
        });
      }
    }
  }

  // Citas: cardiología el próximo jueves, laboratorio la semana siguiente, y dos ya atendidas.
  const hastaJueves = (4 - weekday(today) + 7) % 7 || 7;
  const jueves = addDays(today, hastaJueves);
  const appts: Appt[] = [
    {
      id: 'cita-cardio',
      title: 'Control de cardiología',
      specialist: 'Dr. Ibarra',
      date: jueves,
      time: '10:00',
      place: 'Clínica del Valle, consultorio 304',
      attendeeId: pick('marta'),
      remindDayBefore: true,
      remindHoursBefore: 3,
      status: 'pendiente',
      result: '',
    },
    {
      id: 'cita-lab',
      title: 'Análisis de sangre',
      specialist: 'Laboratorio Central',
      date: addDays(jueves, 6),
      time: '07:30',
      place: 'Laboratorio Central, sede norte',
      attendeeId: pick('carlos'),
      remindDayBefore: true,
      remindHoursBefore: 2,
      status: 'pendiente',
      result: '',
    },
    {
      id: 'cita-vacuna',
      title: 'Vacuna de la gripe',
      specialist: 'Enfermería',
      date: addDays(today, 24),
      time: '16:30',
      place: 'Centro de salud del barrio',
      attendeeId: pick('luis'),
      remindDayBefore: true,
      remindHoursBefore: 0,
      status: 'pendiente',
      result: '',
    },
    {
      id: 'cita-endo',
      title: 'Control de diabetes',
      specialist: 'Dra. Salcedo',
      date: addDays(today, -12),
      time: '09:30',
      place: 'Clínica del Valle, consultorio 210',
      attendeeId: pick('marta'),
      remindDayBefore: true,
      remindHoursBefore: 3,
      status: 'atendida',
      result:
        'Hemoglobina glicosilada en 6,9. Mantener la Metformina. Bajar la sal y los dulces. Próximo control en 3 meses.',
    },
    {
      id: 'cita-vista',
      title: 'Revisión de la vista',
      specialist: 'Dr. Paredes',
      date: addDays(today, -38),
      time: '15:00',
      place: 'Óptica Central',
      attendeeId: pick('ana'),
      remindDayBefore: true,
      remindHoursBefore: 0,
      status: 'atendida',
      result: 'Cambio de lentes. Próximo control en un año.',
    },
  ];

  // Bitácora: 9 notas de los últimos 10 días, de los distintos hermanos.
  const nota = (
    id: string,
    kind: Note['kind'],
    autor: string,
    horasAtras: number,
    text: string
  ): Note => ({ id, kind, authorId: pick(autor), at: nowMs - horasAtras * HORA, text });
  const notes: Note[] = [
    nota('n1', 'animo', 'carlos', 3, `${name} estuvo de buen ánimo hoy. Salió al patio a regar las plantas.`),
    nota('n2', 'comida', 'marta', 22, `Almorzó todo el plato y comió fruta. Durmió una siesta de una hora.`),
    nota(
      'n3',
      'sintoma',
      'ana',
      30,
      `Por teléfono dijo que amaneció con un poco de mareo al levantarse. Le pedí que se siente un rato antes de pararse.`
    ),
    nota('n4', 'sintoma', 'carlos', 52, `Presión en la mañana: 132/84. Sin dolor de cabeza.`),
    nota('n5', 'otra', 'marta', 78, `Llamé a la farmacia: la Metformina está lista para retirar el viernes.`),
    nota('n6', 'animo', 'ana', 100, `Habló poco en la videollamada. Dijo que extraña al grupo de tejido de las vecinas.`),
    nota('n7', 'comida', 'carlos', 150, `Durmió mal, se despertó dos veces. Cenó liviano, solo sopa.`),
    nota(
      'n8',
      'sintoma',
      'marta',
      200,
      `Se le hincharon un poco los tobillos por la tarde. Lo anotamos para la próxima cita con el médico.`
    ),
    nota('n9', 'otra', 'carlos', 235, `Armé el pastillero semanal. Quedó organizado por día y por hora.`),
  ];

  return {
    version: 1,
    demo: true,
    anchor: today,
    seedOptions: opts,
    organizerName: members[0].name,
    currentUserId: 'carlos',
    profile: {
      name,
      age: 78,
      relation,
      allergies: ['Penicilina'],
      allergiesAt: today, // ejemplo: la alergia figura como registrada el día del ejemplo
      conditions: ['Hipertensión', 'Diabetes tipo 2'],
      doctorName: 'Dr. Ibarra (médico de cabecera)',
      doctorPhone: '555-0142',
      emergencyName: 'Carlos (hijo)',
      emergencyPhone: '555-0187',
    },
    members,
    meds,
    doses,
    appts,
    notes,
    questions: '',
    settings: { defaultRemindDayBefore: true, defaultRemindHours: 3, simpleMode: false },
    lastSeenAt: nowMs - 20 * HORA, // la demo abre con un "mientras no estabas" de ejemplo
    hitos: [],
    plan: { estado: 'activo', tipo: 'mensual', desde: nowMs - 35 * DIA },
  };
}

/** Espacio propio tras el recorrido: nunca mezcla condiciones ni historial de demostración. */
export function buildEmptyData(nowMs: number, opts: SeedOptions = {}): AppData {
  const today = keyFromMs(nowMs);
  const organizerName = opts.organizerName?.trim() || 'Tú';
  const name = opts.name?.trim() || 'Tu familiar';
  const relation = opts.relation || 'Familiar mayor';
  const firstMed: Med[] = opts.firstMed
    ? [{ id: 'med-primera', name: opts.firstMed.name.trim(), dose: 'Según receta', times: [opts.firstMed.time], freq: { kind: 'daily' }, notes: '', giverId: null, paused: false, startAt: nowMs }]
    : [];
  return {
    version: 1, demo: false, anchor: today, seedOptions: opts, organizerName, currentUserId: 'organizador',
    profile: { name, age: null, relation, allergies: [], conditions: [], doctorName: '', doctorPhone: '', emergencyName: '', emergencyPhone: '' },
    members: [{ id: 'organizador', name: organizerName, role: 'Organiza el cuidado', tone: 'accent' }],
    meds: firstMed, doses: [], appts: [], notes: [], questions: '',
    settings: { defaultRemindDayBefore: true, defaultRemindHours: 3, simpleMode: false },
    lastSeenAt: nowMs, hitos: [], plan: { estado: 'activo', tipo: 'mensual', desde: nowMs },
  };
}
