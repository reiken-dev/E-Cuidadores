import { describe, expect, it } from 'vitest';
import {
  GRACE_MS,
  adherence,
  apptTone,
  dayStats,
  daysUntilLabel,
  dosesOn,
  freqLabel,
  giverFor,
  nameOf,
  nextDoseInfo,
  reminderText,
  scheduledOn,
} from './schedule';
import { appt, data, dose, key, med, ms } from './test-utils';

const HOY = '2026-09-24'; // jueves

describe('scheduledOn (qué días toca cada medicina)', () => {
  it('todos los días', () => {
    expect(scheduledOn(med(), '2026-09-24')).toBe(true);
    expect(scheduledOn(med(), '2027-01-01')).toBe(true);
  });
  it('días específicos (lunes, miércoles y viernes)', () => {
    const m = med({ freq: { kind: 'weekdays', days: [1, 3, 5] } });
    expect(scheduledOn(m, '2026-09-21')).toBe(true); // lunes
    expect(scheduledOn(m, '2026-09-23')).toBe(true); // miércoles
    expect(scheduledOn(m, '2026-09-24')).toBe(false); // jueves
    expect(scheduledOn(m, '2026-09-27')).toBe(false); // domingo
  });
  it('cada X días desde una fecha ancla', () => {
    const m = med({ freq: { kind: 'interval', every: 3, anchor: '2026-09-20' } });
    expect(scheduledOn(m, '2026-09-20')).toBe(true);
    expect(scheduledOn(m, '2026-09-21')).toBe(false);
    expect(scheduledOn(m, '2026-09-23')).toBe(true);
    expect(scheduledOn(m, '2026-09-26')).toBe(true);
    expect(scheduledOn(m, '2026-09-19')).toBe(false); // antes del ancla no toca
  });
  it('cada X días cruza el cambio de mes sin descuadrarse', () => {
    const m = med({ freq: { kind: 'interval', every: 4, anchor: '2026-09-28' } });
    expect(scheduledOn(m, '2026-10-02')).toBe(true);
    expect(scheduledOn(m, '2026-10-01')).toBe(false);
    expect(scheduledOn(m, '2026-10-06')).toBe(true);
  });
});

describe('dosesOn (estado de cada dosis del día)', () => {
  const d = data({ meds: [med({ times: ['08:00', '20:00'] })] });

  it('pendiente antes de la hora y dentro del margen de 15 minutos', () => {
    const antes = dosesOn(d, HOY, ms(2026, 9, 24, 7, 0));
    expect(antes.map((x) => x.status)).toEqual(['pendiente', 'pendiente']);
    const justo = dosesOn(d, HOY, ms(2026, 9, 24, 8, 15));
    expect(justo[0].status).toBe('pendiente');
  });
  it('atrasada pasado el margen', () => {
    const tarde = dosesOn(d, HOY, ms(2026, 9, 24, 8, 16));
    expect(tarde[0].status).toBe('atrasada');
    expect(tarde[1].status).toBe('pendiente');
    expect(GRACE_MS).toBe(15 * 60000);
  });
  it('dada si hay confirmación, sin importar la hora', () => {
    const conLog = data({ meds: d.meds, doses: [dose('m1', HOY, '08:00', 'marta', ms(2026, 9, 24, 8, 5))] });
    const r = dosesOn(conLog, HOY, ms(2026, 9, 24, 23, 0));
    expect(r[0].status).toBe('dada');
    expect(r[0].log?.byId).toBe('marta');
    expect(r[1].status).toBe('atrasada');
  });
  it('una medicina pausada no genera dosis', () => {
    const pausada = data({ meds: [med({ paused: true })] });
    expect(dosesOn(pausada, HOY, ms(2026, 9, 24, 12, 0))).toEqual([]);
  });
  it('no exige dosis anteriores al inicio de la medicina', () => {
    const nueva = data({ meds: [med({ startAt: ms(2026, 9, 24, 9, 0) })] });
    expect(dosesOn(nueva, HOY, ms(2026, 9, 24, 12, 0))).toEqual([]); // la de las 8:00 ya no se exige
    expect(dosesOn(nueva, '2026-09-25', ms(2026, 9, 25, 7, 0))).toHaveLength(1);
  });
  it('ordena por hora y luego por nombre', () => {
    const varias = data({
      meds: [
        med({ id: 'b', name: 'Metformina', times: ['14:00'] }),
        med({ id: 'a', name: 'Aspirina', times: ['14:00', '08:00'] }),
      ],
    });
    const r = dosesOn(varias, HOY, ms(2026, 9, 24, 6, 0));
    expect(r.map((x) => `${x.time} ${x.med.name}`)).toEqual(['08:00 Aspirina', '14:00 Aspirina', '14:00 Metformina']);
  });
  it('no incluye medicinas que hoy no tocan', () => {
    const lmv = data({ meds: [med({ freq: { kind: 'weekdays', days: [1, 3, 5] } })] });
    expect(dosesOn(lmv, HOY, ms(2026, 9, 24, 6, 0))).toEqual([]);
  });
});

describe('nextDoseInfo (la próxima dosis y el progreso de hoy)', () => {
  const d = data({ meds: [med({ times: ['08:00', '14:00', '21:00'] })] });

  it('la próxima es la primera sin confirmar de hoy', () => {
    const info = nextDoseInfo(d, ms(2026, 9, 24, 7, 0));
    expect(info.next?.time).toBe('08:00');
    expect(info.total).toBe(3);
    expect(info.done).toBe(0);
    expect(info.upcoming).toBeNull();
  });
  it('cuenta lo confirmado y avanza a la siguiente', () => {
    const c = data({ meds: d.meds, doses: [dose('m1', HOY, '08:00')] });
    const info = nextDoseInfo(c, ms(2026, 9, 24, 9, 0));
    expect(info.done).toBe(1);
    expect(info.next?.time).toBe('14:00');
    expect(info.pending).toHaveLength(2);
  });
  it('una dosis atrasada sigue siendo la próxima hasta confirmarla', () => {
    const info = nextDoseInfo(d, ms(2026, 9, 24, 10, 0));
    expect(info.next?.time).toBe('08:00');
    expect(info.next?.status).toBe('atrasada');
  });
  it('con todo confirmado, "upcoming" apunta a la primera dosis de los próximos días', () => {
    const c = data({
      meds: d.meds,
      doses: [dose('m1', HOY, '08:00'), dose('m1', HOY, '14:00'), dose('m1', HOY, '21:00')],
    });
    const info = nextDoseInfo(c, ms(2026, 9, 24, 22, 0));
    expect(info.next).toBeNull();
    expect(info.upcoming?.date).toBe('2026-09-25');
    expect(info.upcoming?.time).toBe('08:00');
  });
  it('si hoy no toca nada, busca hasta 14 días hacia adelante', () => {
    const c = data({ meds: [med({ freq: { kind: 'interval', every: 5, anchor: '2026-09-27' } })] });
    const info = nextDoseInfo(c, ms(2026, 9, 24, 7, 0));
    expect(info.total).toBe(0);
    expect(info.next).toBeNull();
    expect(info.upcoming?.date).toBe('2026-09-27');
  });
  it('sin medicinas no hay próxima ni siguiente', () => {
    const info = nextDoseInfo(data({ meds: [] }), ms(2026, 9, 24, 7, 0));
    expect(info.next).toBeNull();
    expect(info.upcoming).toBeNull();
    expect(info.total).toBe(0);
  });
});

describe('medianoche', () => {
  it('a las 00:05 la dosis de las 23:30 de ayer ya no es de hoy y cuenta como esperada ayer', () => {
    const d = data({ meds: [med({ times: ['23:30'] })] });
    const ahora = ms(2026, 9, 25, 0, 5);
    expect(dosesOn(d, '2026-09-25', ahora)[0].status).toBe('pendiente');
    expect(dosesOn(d, '2026-09-24', ahora)[0].status).toBe('atrasada');
    expect(dayStats(d, '2026-09-24', ahora)).toEqual({ expected: 1, done: 0, skipped: 0 });
  });
  it('a las 23:50 una dosis de las 23:45 aún está dentro del margen', () => {
    const d = data({ meds: [med({ times: ['23:45'] })] });
    expect(dosesOn(d, HOY, ms(2026, 9, 24, 23, 50))[0].status).toBe('pendiente');
  });
});

describe('dayStats y adherence (adherencia del historial)', () => {
  it('cuenta esperadas (ya pasaron o confirmadas) y hechas', () => {
    const d = data({
      meds: [med({ times: ['08:00', '20:00'] })],
      doses: [dose('m1', HOY, '08:00')],
    });
    // A las 12:00 la dosis de las 20:00 todavía no cuenta como esperada
    expect(dayStats(d, HOY, ms(2026, 9, 24, 12, 0))).toEqual({ expected: 1, done: 1, skipped: 0 });
    expect(dayStats(d, HOY, ms(2026, 9, 24, 21, 0))).toEqual({ expected: 2, done: 1, skipped: 0 });
  });
  it('historial vacío: 0 esperadas y porcentaje nulo (no 0%)', () => {
    const d = data({ meds: [] });
    expect(adherence(d, 7, ms(2026, 9, 24, 12, 0))).toEqual({ expected: 0, done: 0, skipped: 0, pct: null });
  });
  it('calcula el porcentaje sobre los días pedidos', () => {
    // 7 días con una dosis diaria a las 08:00; se confirman 5 de los 7 (hoy incluido, ya pasó la hora)
    const dias = [0, 1, 2, 3, 4, 5, 6].map((i) => key(2026, 9, 24 - i));
    const hechas = dias.slice(0, 5).map((k) => dose('m1', k, '08:00'));
    const d = data({ doses: hechas });
    const a = adherence(d, 7, ms(2026, 9, 24, 12, 0));
    expect(a).toEqual({ expected: 7, done: 5, skipped: 0, pct: 71 });
  });
  it('cambia de mes sin perder días (ventana de 7 días desde el 3 de octubre)', () => {
    const d = data({ doses: [dose('m1', '2026-09-30', '08:00'), dose('m1', '2026-10-01', '08:00')] });
    const a = adherence(d, 7, ms(2026, 10, 3, 12, 0));
    expect(a.expected).toBe(7); // 27/09 al 03/10
    expect(a.done).toBe(2);
  });
  it('se puede acotar a una sola medicina', () => {
    const d = data({
      meds: [med({ id: 'a' }), med({ id: 'b', name: 'Metformina' })],
      doses: [dose('a', HOY, '08:00')],
    });
    const now = ms(2026, 9, 24, 12, 0);
    expect(adherence(d, 1, now, 'a').pct).toBe(100);
    expect(adherence(d, 1, now, 'b').pct).toBe(0);
    expect(adherence(d, 1, now).pct).toBe(50);
  });
  it('una medicina pausada no baja la adherencia', () => {
    const d = data({ meds: [med(), med({ id: 'p', paused: true })], doses: [dose('m1', HOY, '08:00')] });
    expect(adherence(d, 1, ms(2026, 9, 24, 12, 0)).pct).toBe(100);
  });
});

describe('giverFor y nameOf', () => {
  const d = data();
  it('usa a la persona asignada', () => {
    expect(giverFor(med({ giverId: 'marta' }), HOY, d.members)?.id).toBe('marta');
  });
  it('si la asignada ya no está en el círculo, cae al primero', () => {
    expect(giverFor(med({ giverId: 'fantasma' }), HOY, d.members)?.id).toBe('carlos');
  });
  it('sin asignada rota entre hermanos según el día', () => {
    const a = giverFor(med({ giverId: null }), '2026-09-24', d.members);
    const b = giverFor(med({ giverId: null }), '2026-09-25', d.members);
    expect(a?.id).not.toBe(b?.id);
    expect(giverFor(med({ giverId: null }), HOY, [])).toBeNull();
  });
  it('nameOf: el familiar, un hermano o alguien desconocido', () => {
    expect(nameOf(d, 'self')).toBe('Rosa');
    expect(nameOf(d, 'ana')).toBe('Ana');
    expect(nameOf(d, 'nadie')).toBe('Alguien de la familia');
  });
});

describe('textos de la agenda', () => {
  it('freqLabel', () => {
    expect(freqLabel({ kind: 'daily' })).toBe('Todos los días');
    expect(freqLabel({ kind: 'interval', every: 1, anchor: HOY })).toBe('Todos los días');
    expect(freqLabel({ kind: 'interval', every: 3, anchor: HOY })).toBe('Cada 3 días');
    expect(freqLabel({ kind: 'weekdays', days: [1, 3, 5] })).toBe('lun, mié y vie');
    expect(freqLabel({ kind: 'weekdays', days: [0] })).toBe('Los domingos');
    expect(freqLabel({ kind: 'weekdays', days: [6] })).toBe('Los sábados');
    expect(freqLabel({ kind: 'weekdays', days: [2] })).toBe('Los martes');
    expect(freqLabel({ kind: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Todos los días');
  });
  it('daysUntilLabel', () => {
    expect(daysUntilLabel('2026-09-24', HOY)).toBe('Hoy');
    expect(daysUntilLabel('2026-09-25', HOY)).toBe('Mañana');
    expect(daysUntilLabel('2026-09-30', HOY)).toBe('En 6 días');
    expect(daysUntilLabel('2026-09-23', HOY)).toBe('Ayer');
    expect(daysUntilLabel('2026-09-20', HOY)).toBe('Hace 4 días');
  });
  it('apptTone: neutro lejos, ámbar cerca, rojo hoy o vencida, y estados cerrados', () => {
    const now = ms(2026, 9, 24, 12, 0);
    expect(apptTone(appt({ date: '2026-10-10' }), HOY, now)).toBe('neutral');
    expect(apptTone(appt({ date: '2026-09-27' }), HOY, now)).toBe('amber');
    expect(apptTone(appt({ date: '2026-09-28' }), HOY, now)).toBe('neutral');
    expect(apptTone(appt({ date: HOY, time: '16:00' }), HOY, now)).toBe('red');
    expect(apptTone(appt({ date: '2026-09-20' }), HOY, now)).toBe('red');
    expect(apptTone(appt({ date: '2026-09-20', status: 'atendida' }), HOY, now)).toBe('done');
    expect(apptTone(appt({ status: 'cancelada' }), HOY, now)).toBe('muted');
  });
  it('reminderText describe los avisos programados', () => {
    expect(reminderText(appt({ date: '2026-09-30', time: '10:00', remindDayBefore: true, remindHoursBefore: 3 }))).toBe(
      'Aviso configurado: el martes 6:00 p. m. y 3 h antes (7:00 a. m.). El envío real se activa al conectar el servicio.'
    );
    expect(reminderText(appt({ remindDayBefore: false, remindHoursBefore: 0 }))).toBeNull();
    expect(reminderText(appt({ remindDayBefore: false, remindHoursBefore: 2, time: '07:30' }))).toBe(
      'Aviso configurado: 2 h antes (5:30 a. m.). El envío real se activa al conectar el servicio.'
    );
  });
});
