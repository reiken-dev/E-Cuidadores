import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { esPrimerMes, estadoDia, hitosNuevos, novedades, ofrecerAnual, racha, semana, valorRecibido } from './retencion';
import { appt, data, dose, key, med, ms, note } from './test-utils';

const HOY = key(2026, 9, 24);
const AHORA = ms(2026, 9, 24, 12, 0);
const INICIO = ms(2026, 9, 1, 0, 0);

/** Registros dados de `desde` a `hasta` (ambos incluidos), cada día a las 8:00. */
function dadas(desde: string, hasta: string, byId = 'carlos') {
  const out = [];
  for (let k = desde; k <= hasta; k = addDays(k, 1)) {
    const [y, m, d] = k.split('-').map(Number);
    out.push(dose('m1', k, '08:00', byId, ms(y, m, d, 8, 10)));
  }
  return out;
}
const base = (doses: ReturnType<typeof dadas>) => data({ meds: [med({ startAt: INICIO })], doses });

describe('estado del día', () => {
  it('completo cuando cada dosis tiene registro; abierto si hoy falta alguna; incompleto en días pasados', () => {
    const d = base(dadas(key(2026, 9, 22), key(2026, 9, 22)));
    expect(estadoDia(d, key(2026, 9, 22), AHORA)).toBe('completo');
    expect(estadoDia(d, key(2026, 9, 23), AHORA)).toBe('incompleto');
    expect(estadoDia(d, HOY, AHORA)).toBe('abierto');
  });
  it('un día sin dosis programadas no cuenta ni rompe', () => {
    const d = data({ meds: [med({ startAt: INICIO, freq: { kind: 'weekdays', days: [1] } })], doses: [] });
    expect(estadoDia(d, key(2026, 9, 22), AHORA)).toBe('sin_dosis');
  });
});

describe('racha del círculo', () => {
  it('cuenta los días seguidos con el registro completo', () => {
    expect(racha(base(dadas(key(2026, 9, 19), key(2026, 9, 23))), AHORA).dias).toBe(5);
  });
  it('suma hoy cuando ya está completo', () => {
    const r = racha(base(dadas(key(2026, 9, 19), HOY)), AHORA);
    expect(r.dias).toBe(6);
    expect(r.hoyCompleto).toBe(true);
  });
  it('hoy sin cerrar no rompe la racha: el día todavía puede completarse', () => {
    expect(racha(base(dadas(key(2026, 9, 10), key(2026, 9, 23))), AHORA).dias).toBe(14);
  });
  it('un día incompleto sin comodín la reinicia', () => {
    const d = base([...dadas(key(2026, 9, 2), key(2026, 9, 7)), ...dadas(key(2026, 9, 9), key(2026, 9, 11))]);
    // el 8 falta; antes de él solo hay 6 días (aún no se ganó comodín)
    const r = racha(d, ms(2026, 9, 12, 12, 0));
    expect(r.dias).toBe(3);
  });
  it('un comodín ganado a los 7 días cubre un día incompleto sin romper nada', () => {
    const d = base([...dadas(key(2026, 9, 1), key(2026, 9, 7)), ...dadas(key(2026, 9, 9), key(2026, 9, 11))]);
    const r = racha(d, ms(2026, 9, 12, 12, 0));
    expect(r.dias).toBe(10); // 7 + (8 cubierto) + 9, 10, 11 → 10 días con registro
    expect(r.comodines).toBe(0);
    expect(r.comodinReciente).toBe(false); // ya hubo días completos después
  });
  it('anotar "no se dio" cuenta como registro completo: decir la verdad suma', () => {
    const d = base([...dadas(key(2026, 9, 20), key(2026, 9, 22)), { ...dose('m1', key(2026, 9, 23), '08:00', 'marta', ms(2026, 9, 23, 9)), skipped: 'rechazo' as const }]);
    expect(racha(d, AHORA).dias).toBe(4);
  });
  it('sin medicinas no hay racha', () => {
    expect(racha(data({ meds: [], doses: [] }), AHORA).dias).toBe(0);
  });
});

describe('la semana del círculo', () => {
  const d = data({
    meds: [med({ startAt: INICIO })],
    doses: [...dadas(key(2026, 9, 18), key(2026, 9, 22), 'carlos'), ...dadas(key(2026, 9, 23), key(2026, 9, 23), 'marta')],
    notes: [note({ id: 'n1', at: ms(2026, 9, 21, 9) }), note({ id: 'n2', at: ms(2026, 9, 1, 9) })],
    appts: [
      appt({ id: 'a1', status: 'atendida', date: key(2026, 9, 21) }),
      appt({ id: 'a2', status: 'pendiente', date: key(2026, 9, 28) }),
      appt({ id: 'a3', status: 'pendiente', date: key(2026, 10, 20) }),
    ],
  });
  const s = semana(d, AHORA);
  it('mide dosis dadas, días completos y quién ayudó', () => {
    expect(s.dadas).toBe(6);
    expect(s.dias).toHaveLength(7);
    expect(s.porMiembro[0]).toMatchObject({ id: 'carlos', dadas: 5 });
    expect(s.porMiembro[1]).toMatchObject({ id: 'marta', dadas: 1 });
  });
  it('trae solo las novedades y citas de la semana', () => {
    expect(s.notas.map((n) => n.id)).toEqual(['n1']);
    expect(s.citasAtendidas.map((a) => a.id)).toEqual(['a1']);
    expect(s.proximasCitas.map((a) => a.id)).toEqual(['a2']);
  });
});

describe('hitos', () => {
  it('celebra la primera dosis una sola vez', () => {
    const d = base(dadas(key(2026, 9, 23), key(2026, 9, 23)));
    expect(hitosNuevos(d, AHORA).map((h) => h.id)).toContain('primera_dosis');
    expect(hitosNuevos({ ...d, hitos: ['primera_dosis'] }, AHORA).map((h) => h.id)).not.toContain('primera_dosis');
  });
  it('la semana completa se celebra al llegar a 7 días', () => {
    const d = base(dadas(key(2026, 9, 17), key(2026, 9, 23)));
    expect(hitosNuevos(d, AHORA).map((h) => h.id)).toContain('racha_7');
  });
  it('un círculo de más de una persona es un hito', () => {
    expect(hitosNuevos(data({ doses: [] }), AHORA).map((h) => h.id)).toContain('circulo_2');
  });
});

describe('mientras no estabas', () => {
  const d = data({
    currentUserId: 'carlos',
    doses: [...dadas(key(2026, 9, 24), key(2026, 9, 24), 'marta')],
    notes: [note({ id: 'n1', authorId: 'ana', at: ms(2026, 9, 24, 10) }), note({ id: 'n2', authorId: 'carlos', at: ms(2026, 9, 24, 10) })],
  });
  it('resume lo que hicieron los demás, no lo propio', () => {
    const n = novedades(d, ms(2026, 9, 23, 20), AHORA)!;
    expect(n.dosis).toEqual([{ nombre: 'Marta', n: 1 }]);
    expect(n.notas.map((x) => x.id)).toEqual(['n1']);
    expect(n.reingreso).toBe(false);
  });
  it('no molesta si la ausencia fue corta, nunca abrió o no hubo nada', () => {
    expect(novedades(d, AHORA - 3600000, AHORA)).toBeNull();
    expect(novedades(d, 0, AHORA)).toBeNull();
    expect(novedades(data({ doses: [] }), ms(2026, 9, 20), AHORA)).toBeNull();
  });
  it('tras 14 días o más se ofrece retomar', () => {
    expect(novedades(d, ms(2026, 9, 1), AHORA)!.reingreso).toBe(true);
  });
});

describe('valor recibido y suscripción', () => {
  it('resume el último mes', () => {
    const d = base(dadas(key(2026, 9, 10), key(2026, 9, 23)));
    const v = valorRecibido(d, AHORA, 30);
    expect(v.dosis).toBe(14);
    expect(v.diasCompletos).toBe(14);
    expect(v.hermanos).toBe(2);
  });
  it('sugiere el anual a quien paga mensual tras dos semanas', () => {
    const plan = { estado: 'activo' as const, tipo: 'mensual' as const, desde: AHORA - 15 * 86400000 };
    expect(ofrecerAnual(plan, AHORA)).toBe(true);
    expect(ofrecerAnual({ ...plan, desde: AHORA - 3 * 86400000 }, AHORA)).toBe(false);
    expect(ofrecerAnual({ ...plan, tipo: 'anual' }, AHORA)).toBe(false);
    expect(ofrecerAnual({ ...plan, estado: 'pago_pendiente' }, AHORA)).toBe(false);
  });
  it('el primer mes es la ventana crítica', () => {
    expect(esPrimerMes({ estado: 'activo', tipo: 'anual', desde: AHORA - 10 * 86400000 }, AHORA)).toBe(true);
    expect(esPrimerMes({ estado: 'activo', tipo: 'anual', desde: AHORA - 40 * 86400000 }, AHORA)).toBe(false);
  });
});
