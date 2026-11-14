import { describe, expect, it } from 'vitest';
import {
  addDays,
  atTime,
  cap,
  diffDays,
  floorTo5,
  fmtAgo,
  fmtClock,
  fmtDayMonth,
  fmtLongDate,
  fmtShortDate,
  fmtTime,
  keyFromMs,
  monthLabel,
  parseKey,
  parseTimeInput,
  relativeDay,
  timeFromMs,
  weekday,
} from './dates';
import { ms } from './test-utils';

describe('fmtTime (12 horas)', () => {
  it('muestra a. m. y p. m. (en español) con minutos de dos dígitos', () => {
    expect(fmtTime('08:00')).toBe('8:00 a. m.');
    expect(fmtTime('13:05')).toBe('1:05 p. m.');
    expect(fmtTime('21:30')).toBe('9:30 p. m.');
  });
  it('medianoche es 12:00 a. m. y mediodía 12:00 p. m.', () => {
    expect(fmtTime('00:00')).toBe('12:00 a. m.');
    expect(fmtTime('00:45')).toBe('12:45 a. m.');
    expect(fmtTime('12:00')).toBe('12:00 p. m.');
    expect(fmtTime('23:59')).toBe('11:59 p. m.');
  });
  it('fmtClock formatea un momento', () => {
    expect(fmtClock(ms(2026, 9, 24, 15, 7))).toBe('3:07 p. m.');
  });
});

describe('floorTo5', () => {
  it('baja al múltiplo de 5 sin pasarse al futuro', () => {
    expect(floorTo5('09:03')).toBe('09:00');
    expect(floorTo5('09:59')).toBe('09:55');
    expect(floorTo5('09:05')).toBe('09:05');
    expect(floorTo5('00:04')).toBe('00:00');
  });
});

describe('parseTimeInput', () => {
  it('acepta las formas comunes de escribir la hora', () => {
    expect(parseTimeInput('8')).toBe('08:00');
    expect(parseTimeInput('8:30')).toBe('08:30');
    expect(parseTimeInput('8am')).toBe('08:00');
    expect(parseTimeInput('8:00 AM')).toBe('08:00');
    expect(parseTimeInput('2 p.m.')).toBe('14:00');
    expect(parseTimeInput('14:30')).toBe('14:30');
    expect(parseTimeInput('  9:05 pm ')).toBe('21:05');
  });
  it('12 AM es medianoche y 12 PM es mediodía', () => {
    expect(parseTimeInput('12am')).toBe('00:00');
    expect(parseTimeInput('12pm')).toBe('12:00');
  });
  it('rechaza lo que no es una hora', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('abc')).toBeNull();
    expect(parseTimeInput('25:00')).toBeNull();
    expect(parseTimeInput('8:75')).toBeNull();
    expect(parseTimeInput('8:30:15')).toBeNull();
  });
});

describe('fechas', () => {
  it('addDays cruza el cambio de mes y de año', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('respeta el año bisiesto', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });
  it('diffDays cuenta días entre dos fechas (con signo)', () => {
    expect(diffDays('2026-09-24', '2026-09-30')).toBe(6);
    expect(diffDays('2026-09-30', '2026-09-24')).toBe(-6);
    expect(diffDays('2026-02-27', '2026-03-02')).toBe(3);
    expect(diffDays('2026-09-24', '2026-09-24')).toBe(0);
  });
  it('weekday: 24 de septiembre de 2026 es jueves', () => {
    expect(weekday('2026-09-24')).toBe(4);
  });
  it('keyFromMs / atTime / timeFromMs son inversos, incluso cerca de la medianoche', () => {
    const t = ms(2026, 9, 24, 23, 59);
    expect(keyFromMs(t)).toBe('2026-09-24');
    expect(timeFromMs(t)).toBe('23:59');
    expect(atTime('2026-09-24', '23:59')).toBe(t);
    const medianoche = ms(2026, 9, 25, 0, 0);
    expect(keyFromMs(medianoche)).toBe('2026-09-25');
    expect(keyFromMs(medianoche - 1)).toBe('2026-09-24');
    expect(atTime('2026-09-25', '00:00')).toBe(medianoche);
  });
  it('parseKey arma la fecha local', () => {
    const d = parseKey('2026-09-24');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 24]);
  });
});

describe('textos de fecha en español', () => {
  it('formatos largos y cortos', () => {
    expect(fmtLongDate('2026-09-24')).toBe('jueves 24 de septiembre');
    expect(fmtShortDate('2026-09-24')).toBe('jue 24 sep');
    expect(fmtDayMonth('2026-01-05')).toBe('5 de enero');
    expect(monthLabel(2026, 8)).toBe('Septiembre 2026');
    expect(cap('hola')).toBe('Hola');
    expect(cap('')).toBe('');
  });
  it('relativeDay: hoy, mañana, ayer y el resto', () => {
    expect(relativeDay('2026-09-24', '2026-09-24')).toBe('Hoy');
    expect(relativeDay('2026-09-25', '2026-09-24')).toBe('Mañana');
    expect(relativeDay('2026-09-23', '2026-09-24')).toBe('Ayer');
    expect(relativeDay('2026-09-28', '2026-09-24')).toBe('Lunes 28 de septiembre');
    expect(relativeDay('2026-10-01', '2026-09-30')).toBe('Mañana'); // cambio de mes
  });
  it('fmtAgo: minutos, horas, ayer y días', () => {
    const now = ms(2026, 9, 24, 12, 0);
    expect(fmtAgo(now, now)).toBe('ahora mismo');
    expect(fmtAgo(now - 5 * 60000, now)).toBe('hace 5 min');
    expect(fmtAgo(now - 3 * 3600000, now)).toBe('hace 3 h');
    expect(fmtAgo(ms(2026, 9, 23, 9, 0), now)).toBe('ayer');
    expect(fmtAgo(ms(2026, 9, 20, 9, 0), now)).toBe('hace 4 días');
  });
  it('fmtAgo nunca da tiempos negativos si el momento es futuro', () => {
    const now = ms(2026, 9, 24, 12, 0);
    expect(fmtAgo(now + 60000, now)).toBe('ahora mismo');
  });
});
