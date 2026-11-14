// Ayudas SOLO para las pruebas (no se importa desde la app): armar datos y momentos concretos.

import { dateKey } from './dates';
import type { Appt, AppData, DoseLog, Med, Note } from './types';

/** Momento en hora local: ms(2026, 9, 24, 8, 30) = 24 de septiembre de 2026, 8:30 (mes 1 a 12). */
export function ms(y: number, mo: number, d: number, h = 0, min = 0): number {
  return new Date(y, mo - 1, d, h, min, 0, 0).getTime();
}

export function key(y: number, mo: number, d: number): string {
  return dateKey(new Date(y, mo - 1, d));
}

export function med(over: Partial<Med> = {}): Med {
  return {
    id: 'm1',
    name: 'Losartán',
    dose: '50 mg',
    times: ['08:00'],
    freq: { kind: 'daily' },
    notes: '',
    giverId: 'carlos',
    paused: false,
    startAt: 0,
    ...over,
  };
}

export function dose(medId: string, date: string, time: string, byId = 'carlos', at?: number): DoseLog {
  return { id: `d-${medId}|${date}|${time}`, medId, date, time, byId, at: at ?? 0 };
}

export function appt(over: Partial<Appt> = {}): Appt {
  return {
    id: 'a1',
    title: 'Control',
    specialist: 'Dr. Ibarra',
    date: '2026-09-30',
    time: '10:00',
    place: 'Clínica',
    attendeeId: 'marta',
    remindDayBefore: true,
    remindHoursBefore: 3,
    status: 'pendiente',
    result: '',
    ...over,
  };
}

export function note(over: Partial<Note> = {}): Note {
  return { id: 'n1', kind: 'sintoma', text: 'Mareo al levantarse', authorId: 'ana', at: 0, ...over };
}

export function data(over: Partial<AppData> = {}): AppData {
  return {
    version: 1,
    demo: false,
    anchor: '2026-09-24',
    seedOptions: {},
    organizerName: 'Carlos',
    currentUserId: 'carlos',
    profile: {
      name: 'Rosa',
      age: 78,
      relation: 'Mamá',
      allergies: ['Penicilina'],
      conditions: ['Hipertensión'],
      doctorName: 'Dr. Ibarra',
      doctorPhone: '555-0142',
      emergencyName: 'Carlos',
      emergencyPhone: '555-0187',
    },
    members: [
      { id: 'carlos', name: 'Carlos', role: 'Hijo', tone: 'accent' },
      { id: 'marta', name: 'Marta', role: 'Hija', tone: 'indigo' },
      { id: 'ana', name: 'Ana', role: 'Hija', tone: 'green' },
    ],
    meds: [med()],
    doses: [],
    appts: [],
    notes: [],
    questions: '',
    settings: { defaultRemindDayBefore: true, defaultRemindHours: 3, simpleMode: false },
    lastSeenAt: 0,
    hitos: [],
    plan: { estado: 'activo', tipo: 'mensual', desde: 0 },
    ...over,
  };
}
