import { describe, expect, it } from 'vitest';
import { buildSummary, buildSummaryText } from './summary';
import { appt, data, dose, key, med, ms, note } from './test-utils';

const NOW = ms(2026, 9, 24, 12, 0);
const HORA = 3600000;

/** Dosis diarias de las 08:00 confirmadas en los últimos `n` días (hoy incluido). */
function confirmadas(medId: string, n: number) {
  return Array.from({ length: n }, (_, i) => dose(medId, key(2026, 9, 24 - i), '08:00'));
}

describe('buildSummary: dosis dadas y sin confirmar', () => {
  it('cuenta las dosis dadas y lista con fecha las que nadie confirmó', () => {
    const s = buildSummary(data({ doses: confirmadas('m1', 10) }), NOW, 2);
    expect(s.esperadas).toBe(14);
    expect(s.dadas).toBe(10);
    expect(s.porMedicina[0].sinConfirmar.map((x) => x.fecha)).toEqual([
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
    ]);
    expect(s.porMedicina[0].sinConfirmar.every((x) => x.estado === 'atrasada')).toBe(true);
  });
  it('una dosis anotada como NO dada cuenta como esperada y no como dada', () => {
    const omitida = { ...dose('m1', '2026-09-23', '08:00'), skipped: 'olvido' as const };
    const s = buildSummary(data({ doses: [dose('m1', '2026-09-24', '08:00'), omitida] }), NOW, 1);
    expect(s.dadas).toBe(1);
    expect(s.esperadas).toBe(7);
    expect(s.porMedicina[0].sinConfirmar).toContainEqual({ fecha: '2026-09-23', hora: '08:00', estado: 'omitida' });
  });
  it('las medicinas pausadas no cuentan, pero se listan aparte', () => {
    const d = data({ meds: [med(), med({ id: 'p', name: 'Pausada', paused: true })], doses: confirmadas('m1', 14) });
    const s = buildSummary(d, NOW, 2);
    expect(s.activeMeds.map((m) => m.id)).toEqual(['m1']);
    expect(s.pausedMeds.map((m) => m.id)).toEqual(['p']);
    expect(s.porMedicina).toHaveLength(1);
    expect(s.dadas).toBe(14);
  });
  it('una dosis de hoy que todavía no toca no cuenta como esperada', () => {
    const s = buildSummary(data({ meds: [med({ times: ['23:00'] })], doses: [] }), NOW, 1);
    expect(s.esperadas).toBe(6);
  });
  it('EL RESUMEN CAMBIA cuando cambia el historial', () => {
    const antes = buildSummary(data({ doses: confirmadas('m1', 7) }), NOW, 1);
    const despues = buildSummary(data({ doses: confirmadas('m1', 3) }), NOW, 1);
    expect(antes.dadas).toBe(7);
    expect(despues.dadas).toBe(3);
  });
});

describe('buildSummaryText (versión para compartir)', () => {
  it('trae medicinas, dosis y fechas, y nada más', () => {
    const omitida = { ...dose('m1', '2026-09-23', '08:00'), skipped: 'rechazo' as const };
    const d = data({
      meds: [med({ notes: 'Tomar en ayunas' })],
      doses: [dose('m1', '2026-09-24', '08:00'), omitida],
      notes: [note({ text: 'Se hincharon los tobillos', at: NOW - 2 * HORA })],
      questions: '¿Se puede bajar la dosis?',
      appts: [appt({ title: 'Control de cardiología', date: '2026-09-30' })],
    });
    const t = buildSummaryText(buildSummary(d, NOW, 1));
    expect(t).toContain('- Losartán 50 mg: 8:00 a. m. (todos los días)');
    expect(t).toContain('En total: 1 de 7 dosis dadas.');
    expect(t).toContain('no se dio');
    // Dentro: el nombre de quien se cuida y sus alergias (con su fecha de registro).
    expect(t).toContain('Paciente: Rosa');
    expect(t).toContain('ALERGIAS (DATO DE SEGURIDAD)');
    expect(t).toContain('- Penicilina');
    // Fuera: notas, síntomas, preguntas, citas, condiciones, motivos, contactos y nombres de quien da las dosis.
    expect(t).not.toContain('Tomar en ayunas');
    expect(t).not.toContain('tobillos');
    expect(t).not.toContain('bajar la dosis');
    expect(t).not.toContain('Control de cardiología');
    expect(t).not.toContain('Hipertensión');
    expect(t).not.toContain('Dr. Ibarra');
    expect(t).not.toContain('555-0187');
    expect(t).not.toContain('Carlos');
    expect(t).not.toContain('No quiso tomarla');
  });
  it('las alergias salen como dato de seguridad, con la fecha en que la familia las registró', () => {
    const d = data({ profile: { ...data().profile, allergies: ['Penicilina', 'Ibuprofeno'], allergiesAt: '2026-09-10' } });
    const t = buildSummaryText(buildSummary(d, NOW, 1));
    expect(t).toContain('ALERGIAS (DATO DE SEGURIDAD)\n- Penicilina\n- Ibuprofeno\n');
    expect(t).toContain('Datos registrados por la familia en la app. Fecha de registro: 10 de septiembre de 2026.');
  });
  it('sin alergias lo dice, y sin fecha guardada no inventa una', () => {
    const sinAlergias = buildSummaryText(buildSummary(data({ profile: { ...data().profile, allergies: [], allergiesAt: '2026-09-10' } }), NOW, 1));
    expect(sinAlergias).toContain('ALERGIAS (DATO DE SEGURIDAD)\nNinguna registrada por la familia.');
    const sinFecha = buildSummaryText(buildSummary(data({ profile: { ...data().profile, allergiesAt: undefined } }), NOW, 1));
    expect(sinFecha).toContain('- Penicilina');
    expect(sinFecha).toContain('Fecha de registro no disponible.');
  });
  it('la fecha de alergias se descarta si no hay alergias', () => {
    const s = buildSummary(data({ profile: { ...data().profile, allergies: [], allergiesAt: '2026-09-10' } }), NOW, 1);
    expect(s.alergiasAt).toBeNull();
    expect(s.paciente).toBe('Rosa');
  });
  it('sin datos dice lo que falta en vez de inventar números', () => {
    const t = buildSummaryText(buildSummary(data({ meds: [] }), NOW, 4));
    expect(t).toContain('Ninguna registrada.');
    expect(t).toContain('Aún no hay dosis registradas en este período.');
  });
  it('el texto cambia si cambia el historial', () => {
    const uno = data({ doses: confirmadas('m1', 7) });
    const dos = data({ doses: confirmadas('m1', 2) });
    const t1 = buildSummaryText(buildSummary(uno, NOW, 1));
    const t2 = buildSummaryText(buildSummary(dos, NOW, 1));
    expect(t1).not.toBe(t2);
    expect(t2).toContain('En total: 2 de 7 dosis dadas.');
  });
});
