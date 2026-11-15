// Pruebas del store: se simula el navegador (window + localStorage) y se carga el módulo de cero
// en cada prueba para que no comparta estado. Hora fija: jueves 24 de septiembre de 2026, 10:00.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keyFromMs } from './dates';
import { appt, med, ms, note } from './test-utils';
import type { AppData } from './types';

type Store = typeof import('./store');

const NOW = ms(2026, 9, 24, 10, 0);
const HOY = '2026-09-24';

class FakeStorage {
  map = new Map<string, string>();
  throwOnRead = false;
  throwOnWrite = false;
  getItem(k: string) {
    if (this.throwOnRead) throw new DOMException('bloqueado', 'SecurityError');
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.throwOnWrite) throw new DOMException('sin espacio', 'QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

let storage: FakeStorage;

async function abrir(): Promise<Store> {
  vi.resetModules();
  // Estas pruebas describen el modo LOCAL (demostración). No dependen de lo que valga conexiones.supabase en
  // lib/marca.ts: así siguen pasando cuando conectes Supabase. El modo remoto se prueba en lib/store-remoto.test.ts.
  const real = await vi.importActual<typeof import('./marca')>('./marca');
  vi.doMock('./marca', () => ({ ...real, MARCA: { ...real.MARCA, conexiones: { ...real.MARCA.conexiones, supabase: false } } }));
  return (await import('./store')) as Store;
}

function guardado(): AppData {
  return JSON.parse(storage.map.get('entre-hermanos:v1') as string) as AppData;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  storage = new FakeStorage();
  vi.stubGlobal('window', { localStorage: storage, addEventListener: () => {} });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.doUnmock('./marca');
});

describe('ids nuevos', () => {
  it('siempre son un uuid válido, también donde no existe crypto.randomUUID (contexto no seguro): la base lo exige', async () => {
    const { newId } = await abrir();
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(newId()).toMatch(UUID);
    vi.stubGlobal('crypto', undefined);
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(UUID);
  });
});

describe('arranque del store', () => {
  it('sin nada guardado arranca con los datos de ejemplo', async () => {
    const { getSnapshot, STORAGE_KEY } = await abrir();
    const d = getSnapshot();
    expect(d.demo).toBe(true);
    expect(d.anchor).toBe(HOY);
    expect(d.meds.length).toBeGreaterThan(0);
    expect(d.members.length).toBeGreaterThan(0);
    expect(STORAGE_KEY).toBe('entre-hermanos:v1');
  });
  it('localStorage con texto corrupto: cae al ejemplo sin lanzar errores', async () => {
    storage.map.set('entre-hermanos:v1', '{esto no es json');
    const { getSnapshot } = await abrir();
    expect(() => getSnapshot()).not.toThrow();
    expect(getSnapshot().demo).toBe(true);
    expect(getSnapshot().meds.length).toBeGreaterThan(0);
  });
  it('valor con otra forma o de otra versión: cae al ejemplo', async () => {
    for (const raw of ['42', 'null', '[]', '{"version":9}', '{"version":1}', '{"version":1,"meds":"x"}']) {
      storage.map.set('entre-hermanos:v1', raw);
      const { getSnapshot } = await abrir();
      expect(getSnapshot().meds.length).toBeGreaterThan(0);
      expect(getSnapshot().members.length).toBeGreaterThan(0);
    }
  });
  it('navegador que bloquea el almacenamiento (modo privado): funciona en memoria', async () => {
    storage.throwOnRead = true;
    storage.throwOnWrite = true;
    const { getSnapshot, actions } = await abrir();
    expect(getSnapshot().demo).toBe(true);
    expect(() => actions.saveNote(note({ id: 'nueva', text: 'Hola', authorId: 'carlos', at: NOW }))).not.toThrow();
    expect(getSnapshot().notes.some((n) => n.id === 'nueva')).toBe(true);
  });
  it('sin window (servidor): entrega el ejemplo', async () => {
    vi.unstubAllGlobals();
    const { getSnapshot } = await abrir();
    expect(getSnapshot().demo).toBe(true);
  });
  it('restaura lo guardado válido', async () => {
    const primero = await abrir();
    primero.actions.saveNote(note({ id: 'mia', text: 'Recuerdo', authorId: 'carlos', at: NOW }));
    const segundo = await abrir(); // "recargar la página"
    expect(segundo.getSnapshot().notes.some((n) => n.id === 'mia')).toBe(true);
    expect(segundo.getSnapshot().demo).toBe(true); // sigue siendo ejemplo
    expect(segundo.getSnapshot().editado).toBe(true);
  });
  it('datos de ejemplo de otro día se regeneran, conservando ajustes y preguntas', async () => {
    const primero = await abrir();
    primero.actions.setQuestions('¿Y la presión?');
    primero.actions.updateSettings({ defaultRemindHours: 1 });
    vi.setSystemTime(ms(2026, 9, 25, 9, 0));
    const segundo = await abrir();
    const d = segundo.getSnapshot();
    expect(d.demo).toBe(true);
    expect(d.anchor).toBe('2026-09-25');
    expect(d.questions).toBe('¿Y la presión?');
    expect(d.settings.defaultRemindHours).toBe(1);
  });
  it('lo que el usuario cambió NO se regenera al día siguiente', async () => {
    const primero = await abrir();
    primero.actions.saveNote(note({ id: 'propia', text: 'Mía', authorId: 'carlos', at: NOW }));
    vi.setSystemTime(ms(2026, 9, 25, 9, 0));
    const segundo = await abrir();
    expect(segundo.getSnapshot().notes.some((n) => n.id === 'propia')).toBe(true);
    expect(segundo.getSnapshot().anchor).toBe(HOY);
  });
  it('el modo simple guardado no se restaura', async () => {
    const primero = await abrir();
    primero.actions.updateSettings({ simpleMode: true });
    expect(guardado().settings.simpleMode).toBe(true);
    const segundo = await abrir();
    expect(segundo.getSnapshot().settings.simpleMode).toBe(false);
  });
});

describe('confirmar una dosis (regla: siempre quién y a qué hora)', () => {
  const dosisHoy = { date: HOY, time: '08:00' };

  it('guarda quién la dio y a qué hora', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    const at = ms(2026, 9, 24, 8, 20);
    const ok = actions.confirmDose({ medId, ...dosisHoy, byId: 'marta', at });
    expect(ok).toBe(true);
    const log = getSnapshot().doses.find((x) => x.medId === medId && x.date === HOY && x.time === '08:00');
    expect(log?.byId).toBe('marta');
    expect(log?.at).toBe(at);
    expect(guardado().doses.some((x) => x.medId === medId && x.byId === 'marta' && x.at === at)).toBe(true);
  });
  it('sin la hora explícita usa el momento actual', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    expect(actions.confirmDose({ medId, ...dosisHoy, byId: 'carlos' })).toBe(true);
    expect(getSnapshot().doses.find((x) => x.medId === medId && x.date === HOY && x.time === '08:00')?.at).toBe(NOW);
  });
  it('el propio familiar puede confirmar desde el modo simple', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    expect(actions.confirmDose({ medId, ...dosisHoy, byId: 'self' })).toBe(true);
  });
  it('RECHAZA la confirmación sin autor, con autor desconocido o con datos inválidos', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    const antes = getSnapshot().doses.length;
    expect(actions.confirmDose({ medId, ...dosisHoy, byId: '' })).toBe(false);
    expect(actions.confirmDose({ medId, ...dosisHoy, byId: 'desconocido' })).toBe(false);
    expect(actions.confirmDose({ medId, date: HOY, time: '8am', byId: 'carlos' })).toBe(false);
    expect(actions.confirmDose({ medId, date: 'hoy', time: '08:00', byId: 'carlos' })).toBe(false);
    expect(actions.confirmDose({ medId: 'no-existe', ...dosisHoy, byId: 'carlos' })).toBe(false);
    expect(actions.confirmDose({ medId, ...dosisHoy, byId: 'carlos', at: Number.NaN })).toBe(false);
    expect(getSnapshot().doses.length).toBe(antes);
  });
  it('confirmar dos veces la misma dosis deja una sola confirmación (la última)', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    actions.confirmDose({ medId, ...dosisHoy, byId: 'carlos', at: ms(2026, 9, 24, 8, 5) });
    actions.confirmDose({ medId, ...dosisHoy, byId: 'marta', at: ms(2026, 9, 24, 8, 10) });
    const logs = getSnapshot().doses.filter((x) => x.medId === medId && x.date === HOY && x.time === '08:00');
    expect(logs).toHaveLength(1);
    expect(logs[0].byId).toBe('marta');
  });
  it('confirmar una dosis NO cuenta como cambio propio (el ejemplo sigue vigente)', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.confirmDose({ medId: getSnapshot().meds[0].id, ...dosisHoy, byId: 'carlos', at: NOW });
    expect(getSnapshot().demo).toBe(true);
  });
  it('deshacer quita la confirmación', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    actions.confirmDose({ medId, ...dosisHoy, byId: 'carlos', at: NOW });
    actions.undoDose(medId, HOY, '08:00');
    expect(getSnapshot().doses.some((x) => x.medId === medId && x.date === HOY && x.time === '08:00')).toBe(false);
  });
});

describe('medicinas', () => {
  it('agregar: aparece, se guarda y el ejemplo queda como editado (sigue siendo ejemplo)', async () => {
    const { actions, getSnapshot } = await abrir();
    const total = getSnapshot().meds.length;
    actions.saveMed(med({ id: 'nueva', name: 'Omeprazol' }));
    expect(getSnapshot().meds).toHaveLength(total + 1);
    expect(getSnapshot().demo).toBe(true);
    expect(getSnapshot().editado).toBe(true);
    expect(guardado().meds.some((m) => m.id === 'nueva')).toBe(true);
  });
  it('editar reemplaza sin duplicar', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.saveMed(med({ id: 'nueva', name: 'Omeprazol' }));
    const total = getSnapshot().meds.length;
    actions.saveMed(med({ id: 'nueva', name: 'Omeprazol', dose: '40 mg', times: ['07:00', '19:00'] }));
    expect(getSnapshot().meds).toHaveLength(total);
    const m = getSnapshot().meds.find((x) => x.id === 'nueva');
    expect(m?.dose).toBe('40 mg');
    expect(m?.times).toEqual(['07:00', '19:00']);
  });
  it('pausar y reanudar', async () => {
    const { actions, getSnapshot } = await abrir();
    const id = getSnapshot().meds[0].id;
    actions.toggleMedPause(id);
    expect(getSnapshot().meds.find((m) => m.id === id)?.paused).toBe(true);
    actions.toggleMedPause(id);
    expect(getSnapshot().meds.find((m) => m.id === id)?.paused).toBe(false);
  });
  it('eliminar quita la medicina y también su historial de dosis', async () => {
    const { actions, getSnapshot } = await abrir();
    const id = getSnapshot().meds[0].id;
    expect(getSnapshot().doses.some((x) => x.medId === id)).toBe(true);
    actions.deleteMed(id);
    expect(getSnapshot().meds.some((m) => m.id === id)).toBe(false);
    expect(getSnapshot().doses.some((x) => x.medId === id)).toBe(false);
  });
});

describe('citas', () => {
  it('agregar, editar y cambiar de estado', async () => {
    const { actions, getSnapshot } = await abrir();
    const total = getSnapshot().appts.length;
    actions.saveAppt(appt({ id: 'c1', title: 'Dentista' }));
    expect(getSnapshot().appts).toHaveLength(total + 1);
    actions.saveAppt(appt({ id: 'c1', title: 'Dentista', time: '15:30', attendeeId: null }));
    expect(getSnapshot().appts).toHaveLength(total + 1);
    const c = getSnapshot().appts.find((a) => a.id === 'c1');
    expect(c?.time).toBe('15:30');
    expect(c?.attendeeId).toBeNull();
    actions.setApptStatus('c1', 'atendida', 'Todo bien. Volver en 6 meses.');
    expect(getSnapshot().appts.find((a) => a.id === 'c1')).toMatchObject({ status: 'atendida', result: 'Todo bien. Volver en 6 meses.' });
    actions.setApptStatus('c1', 'cancelada');
    expect(getSnapshot().appts.find((a) => a.id === 'c1')?.result).toBe('Todo bien. Volver en 6 meses.'); // conserva el resultado
  });
});

describe('bitácora, perfil y ajustes', () => {
  it('agregar, editar y eliminar una nota', async () => {
    const { actions, getSnapshot } = await abrir();
    const total = getSnapshot().notes.length;
    actions.saveNote(note({ id: 'nx', text: 'Primera', at: NOW }));
    expect(getSnapshot().notes).toHaveLength(total + 1);
    actions.saveNote(note({ id: 'nx', text: 'Editada', at: NOW }));
    expect(getSnapshot().notes).toHaveLength(total + 1);
    expect(getSnapshot().notes.find((n) => n.id === 'nx')?.text).toBe('Editada');
    actions.deleteNote('nx');
    expect(getSnapshot().notes).toHaveLength(total);
  });
  it('actualizar el perfil cambia solo lo pedido', async () => {
    const { actions, getSnapshot } = await abrir();
    const antes = getSnapshot().profile;
    actions.updateProfile({ doctorName: 'Dra. Salcedo' });
    expect(getSnapshot().profile.doctorName).toBe('Dra. Salcedo');
    expect(getSnapshot().profile.name).toBe(antes.name);
    expect(getSnapshot().demo).toBe(true);
  });
  it('la fecha de registro de las alergias cambia solo si cambia la lista', async () => {
    const { actions, getSnapshot } = await abrir();
    const antes = getSnapshot().profile.allergiesAt;
    actions.updateProfile({ doctorName: 'Dra. Salcedo' });
    expect(getSnapshot().profile.allergiesAt).toBe(antes);
    actions.updateProfile({ allergies: ['Penicilina', 'Ibuprofeno'] });
    expect(getSnapshot().profile.allergiesAt).toBe(HOY);
    actions.updateProfile({ allergies: [] });
    expect(getSnapshot().profile.allergiesAt).toBeNull();
  });
  it('preguntas y ajustes no cuentan como cambio propio', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.setQuestions('¿Cada cuánto el control?');
    actions.updateSettings({ defaultRemindHours: 2 });
    expect(getSnapshot().questions).toBe('¿Cada cuánto el control?');
    expect(getSnapshot().settings.defaultRemindHours).toBe(2);
    expect(getSnapshot().demo).toBe(true);
  });
});

describe('restablecer y recorrido inicial', () => {
  it('la demo guarda una copia local de los datos propios y permite recuperarlos', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.applyOnboarding({ name: 'Elena', organizerName: 'Marta', relation: 'Mamá', members: 2 });
    actions.saveNote(note({ id: 'mia', text: 'Dato propio', at: NOW }));
    expect(actions.enterDemo()).toBe('loaded');
    expect(getSnapshot().demo).toBe(true);
    expect(getSnapshot().notes.some((n) => n.id === 'mia')).toBe(false);
    expect(actions.restorePersonalData()).toBe('restored');
    expect(getSnapshot().demo).toBe(false);
    expect(getSnapshot().profile.name).toBe('Elena');
    expect(getSnapshot().notes.some((n) => n.id === 'mia')).toBe(true);
  });
  it('no inventa datos propios para restaurar si solo se abrió el ejemplo', async () => {
    const { actions } = await abrir();
    expect(actions.restorePersonalData()).toBe('missing');
  });
  it('al terminar el recorrido solo crea los datos que la persona escribió', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.applyOnboarding({
      name: 'Lucía',
      organizerName: 'Marta',
      relation: 'Mamá',
      members: 2,
      firstMed: { name: 'Enalapril', time: '07:00' },
    });
    const d = getSnapshot();
    expect(d.demo).toBe(false);
    expect(d.profile).toMatchObject({ name: 'Lucía', allergies: [], conditions: [] });
    expect(d.meds.map((med) => med.name)).toEqual(['Enalapril']);
    expect(d.appts).toEqual([]);
    expect(d.notes).toEqual([]);
    expect(d.organizerName).toBe('Marta');
  });
  it('resetDemo vuelve al ejemplo completo y conserva el nombre y los hermanos del recorrido', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.applyOnboarding({ name: 'Elena', relation: 'Mamá', members: 2, firstMed: { name: 'Enalapril', time: '07:00' } });
    actions.saveMed(med({ id: 'extra', name: 'Extra' }));
    actions.saveNote(note({ id: 'extra-n', text: 'Extra', at: NOW }));
    expect(getSnapshot().demo).toBe(false);
    actions.resetDemo();
    const d = getSnapshot();
    expect(d.demo).toBe(true);
    expect(d.meds.some((m) => m.id === 'extra')).toBe(false);
    expect(d.notes.some((n) => n.id === 'extra-n')).toBe(false);
    expect(d.profile.name).toBe('Elena');
    expect(d.members).toHaveLength(2);
    expect(d.meds.some((m) => m.name === 'Enalapril')).toBe(true);
    expect(keyFromMs(NOW)).toBe(d.anchor);
  });
  it('applyOnboarding arma la app con el nombre, los hermanos y la primera medicina', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.applyOnboarding({ name: '  Elena ', relation: 'Papá', members: 4, firstMed: { name: 'Enalapril', time: '07:00' } });
    const d = getSnapshot();
    expect(d.profile.name).toBe('Elena');
    expect(d.profile.relation).toBe('Papá');
    expect(d.members).toHaveLength(1);
    const primera = d.meds.find((m) => m.id === 'med-primera');
    expect(primera?.times).toEqual(['07:00']);
    expect(guardado().profile.name).toBe('Elena');
  });
  it('sin primera medicina ni nombre inicia un espacio propio vacío', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.applyOnboarding({});
    expect(getSnapshot().profile.name).toBe('Tu familiar');
    expect(getSnapshot().meds.some((m) => m.id === 'med-primera')).toBe(false);
  });
});

describe('anotar que una dosis NO se dio (registro honesto)', () => {
  const dosisHoy = { date: HOY, time: '08:00' };

  it('guarda quién lo anotó y el motivo, y no cuenta como dosis dada', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    expect(actions.skipDose({ medId, ...dosisHoy, byId: 'marta', reason: 'rechazo' })).toBe(true);
    const log = getSnapshot().doses.find((x) => x.medId === medId && x.date === HOY && x.time === '08:00');
    expect(log).toMatchObject({ byId: 'marta', skipped: 'rechazo' });
    expect(guardado().doses.find((x) => x.medId === medId && x.date === HOY && x.time === '08:00')?.skipped).toBe('rechazo');
  });
  it('RECHAZA autor desconocido, motivo inventado o datos inválidos', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    expect(actions.skipDose({ medId, ...dosisHoy, byId: '', reason: 'olvido' })).toBe(false);
    expect(actions.skipDose({ medId, ...dosisHoy, byId: 'nadie', reason: 'olvido' })).toBe(false);
    expect(actions.skipDose({ medId, ...dosisHoy, byId: 'carlos', reason: 'inventado' as never })).toBe(false);
    expect(actions.skipDose({ medId: 'no-existe', ...dosisHoy, byId: 'carlos', reason: 'olvido' })).toBe(false);
  });
  it('se puede deshacer y volver a anotar', async () => {
    const { actions, getSnapshot } = await abrir();
    const medId = getSnapshot().meds[0].id;
    actions.skipDose({ medId, ...dosisHoy, byId: 'carlos', reason: 'ausente' });
    actions.undoDose(medId, HOY, '08:00');
    expect(getSnapshot().doses.some((x) => x.medId === medId && x.date === HOY && x.time === '08:00')).toBe(false);
  });
});

describe('retención: visita, hitos y plan', () => {
  it('marcar la visita guarda la hora sin dejar de ser demostración', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.markSeen(NOW);
    expect(getSnapshot().lastSeenAt).toBe(NOW);
    expect(getSnapshot().demo).toBe(true);
  });
  it('un hito se guarda una sola vez', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.markHito('racha_7');
    actions.markHito('racha_7');
    expect(getSnapshot().hitos).toEqual(['racha_7']);
  });
  it('el estado del plan se actualiza y se conserva al recargar', async () => {
    const { actions } = await abrir();
    actions.setPlan({ estado: 'pago_pendiente', tipo: 'anual' });
    const { getSnapshot } = await abrir();
    expect(getSnapshot().plan).toMatchObject({ estado: 'pago_pendiente', tipo: 'anual' });
  });
  it('el espacio propio empieza con plan activo, sin hitos y con la visita de hoy', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.applyOnboarding({ name: 'Lucía', organizerName: 'Sofía', members: 2, firstMed: { name: 'Enalapril', time: '08:00' } });
    const d = getSnapshot();
    expect(d.plan.estado).toBe('activo');
    expect(d.hitos).toEqual([]);
    expect(d.lastSeenAt).toBe(NOW);
  });
});

describe('revisión final: el ejemplo no se hace pasar por datos reales y el pasado no se reescribe', () => {
  it('editar el ejemplo y luego hacer el recorrido SÍ crea un espacio propio limpio', async () => {
    const { actions, getSnapshot } = await abrir();
    actions.saveNote(note({ id: 'x', text: 'tocó el ejemplo', authorId: 'carlos', at: NOW }));
    expect(getSnapshot().demo).toBe(true);
    expect(actions.applyOnboarding({ name: 'Elena', organizerName: 'Marta', relation: 'Mamá', members: 1 })).toBe('applied');
    const d = getSnapshot();
    expect(d.demo).toBe(false);
    expect(d.profile.allergies).toEqual([]);
    expect(d.doses).toHaveLength(0);
    expect(d.notes).toHaveLength(0);
  });
  it('cambiar la hora de una medicina no baja la adherencia ni reescribe el pasado', async () => {
    const { actions, getSnapshot } = await abrir();
    const { adherence } = await import('./schedule');
    const antes = adherence(getSnapshot(), 14, NOW);
    const m = getSnapshot().meds.find((x) => x.times.length === 1 && x.freq.kind === 'daily')!;
    actions.saveMed({ ...m, times: ['09:30'] });
    const despues = adherence(getSnapshot(), 14, NOW);
    expect(despues.pct ?? 100).toBeGreaterThanOrEqual((antes.pct ?? 0) - 10);
    expect(getSnapshot().meds.find((x) => x.id === m.id)?.scheduleFrom).toBeGreaterThan(0);
  });
  it('pausar y reanudar no inventa dosis "no dadas" de los días pausados', async () => {
    const { actions, getSnapshot } = await abrir();
    const { dosesOn } = await import('./schedule');
    const id = getSnapshot().meds[0].id;
    actions.toggleMedPause(id);
    vi.setSystemTime(ms(2026, 9, 27, 7, 0));
    actions.toggleMedPause(id);
    const ayer = dosesOn(getSnapshot(), '2026-09-25', ms(2026, 9, 27, 7, 0)).filter((d) => d.med.id === id && !d.log);
    expect(ayer).toHaveLength(0);
  });
});
