// Resumen para el médico: lo mínimo que la consulta necesita. Nombre de quien se cuida, sus alergias
// (dato de seguridad, con la fecha en que la familia las registró), nombres de medicinas, horarios, dosis
// registradas (dadas y no confirmadas) y sus fechas. Sin notas, síntomas, condiciones, contactos, citas,
// motivos ni nombres de quien dio cada dosis. Se CALCULA de lo registrado.
// No se envía nada solo: el usuario revisa la vista previa y decide si la imprime o la comparte.

import { addDays, cap, fmtDayMonth, fmtLongDate, fmtShortDate, fmtTime, keyFromMs, parseKey } from './dates';
import { dosesOn, freqLabel, type DoseInstance } from './schedule';
import type { AppData, Med } from './types';

/** Dosis que debían darse y no tienen confirmación. */
export interface DosisSinConfirmar {
  fecha: string; // 'YYYY-MM-DD'
  hora: string; // 'HH:MM'
  estado: 'omitida' | 'atrasada'; // omitida: se anotó que no se dio · atrasada: nadie la confirmó
}

export interface MedResumen {
  med: Med;
  dadas: number;
  esperadas: number;
  sinConfirmar: DosisSinConfirmar[]; // la más antigua primero
}

export interface Summary {
  weeks: number;
  todayK: string;
  paciente: string; // nombre de quien se cuida
  alergias: string[]; // registradas por la familia (dato de seguridad)
  alergiasAt: string | null; // 'YYYY-MM-DD' en que la familia las registró; null = fecha no registrada
  activeMeds: Med[];
  pausedMeds: Med[];
  porMedicina: MedResumen[];
  dadas: number;
  esperadas: number;
}

export const ESTADO_SIN_CONFIRMAR = { omitida: 'no se dio', atrasada: 'sin confirmar' } as const;

export function buildSummary(data: AppData, nowMs: number, weeks: number): Summary {
  const todayK = keyFromMs(nowMs);
  const activeMeds = data.meds.filter((m) => !m.paused);
  // Días en orden cronológico; las dosis de cada día ya vienen por hora.
  const dias = Array.from({ length: weeks * 7 }, (_, i) => addDays(todayK, -i)).reverse();
  const porDia: DoseInstance[][] = dias.map((k) => dosesOn(data, k, nowMs));

  // [VERIFICAR: revisión de profesional de salud] Las dosis dadas son el registro de la familia, no un dato clínico.
  // Confirma con un profesional que el médico lo lea como registro.
  const porMedicina: MedResumen[] = activeMeds.map((med) => {
    const r: MedResumen = { med, dadas: 0, esperadas: 0, sinConfirmar: [] };
    for (const lista of porDia) {
      for (const d of lista) {
        if (d.med.id !== med.id) continue;
        if (d.status === 'dada') {
          r.dadas++;
          r.esperadas++;
        } else if (d.status === 'omitida' || d.status === 'atrasada') {
          r.esperadas++;
          r.sinConfirmar.push({ fecha: d.date, hora: d.time, estado: d.status });
        }
        // 'pendiente': aún no toca; no cuenta.
      }
    }
    return r;
  });

  return {
    weeks,
    todayK,
    paciente: data.profile.name,
    alergias: data.profile.allergies,
    alergiasAt: data.profile.allergies.length ? (data.profile.allergiesAt ?? null) : null,
    activeMeds,
    pausedMeds: data.meds.filter((m) => m.paused),
    porMedicina,
    dadas: porMedicina.reduce((n, r) => n + r.dadas, 0),
    esperadas: porMedicina.reduce((n, r) => n + r.esperadas, 0),
  };
}

/** Fecha de registro de las alergias, con año: "19 de octubre de 2026". */
export function fechaRegistro(k: string): string {
  return `${fmtDayMonth(k)} de ${parseKey(k).getFullYear()}`;
}

/** Texto que acompaña a las alergias: siempre dice que las registró la familia y nunca inventa una fecha. */
export function notaAlergias(s: Pick<Summary, 'alergias' | 'alergiasAt'>): string {
  if (s.alergias.length === 0) return 'Ninguna registrada por la familia.';
  const fecha = s.alergiasAt ? `Fecha de registro: ${fechaRegistro(s.alergiasAt)}.` : 'Fecha de registro no disponible.';
  return `Datos registrados por la familia en la app. ${fecha}`;
}

/** Versión en texto plano para compartir o copiar. */
export function buildSummaryText(s: Summary): string {
  const L: string[] = [];
  L.push('RESUMEN DE MEDICINAS PARA EL MÉDICO');
  L.push(`Paciente: ${s.paciente}`);
  L.push(`Preparado el ${fmtLongDate(s.todayK)}. Período: últimas ${s.weeks} semanas.`);
  L.push('');
  L.push('ALERGIAS (DATO DE SEGURIDAD)');
  for (const a of s.alergias) L.push(`- ${a}`);
  L.push(notaAlergias(s));
  L.push('');
  L.push('MEDICINAS ACTUALES');
  if (s.activeMeds.length === 0) L.push('Ninguna registrada.');
  for (const m of s.activeMeds) {
    L.push(`- ${m.name} ${m.dose}: ${m.times.map(fmtTime).join(', ')} (${freqLabel(m.freq).toLowerCase()})`);
  }
  if (s.pausedMeds.length > 0) L.push(`En pausa: ${s.pausedMeds.map((m) => m.name).join(', ')}`);
  L.push('');
  L.push('DOSIS REGISTRADAS');
  if (s.esperadas === 0) {
    L.push('Aún no hay dosis registradas en este período.');
  } else {
    L.push(`En total: ${s.dadas} de ${s.esperadas} dosis dadas.`);
    for (const r of s.porMedicina) {
      if (r.esperadas === 0) continue;
      L.push(`- ${r.med.name}: ${r.dadas} de ${r.esperadas} dadas`);
      for (const x of r.sinConfirmar) {
        L.push(`  · ${cap(fmtShortDate(x.fecha))}, ${fmtTime(x.hora)}: ${ESTADO_SIN_CONFIRMAR[x.estado]}`);
      }
    }
  }
  L.push('');
  L.push('Generado con E-Cuidadores. Es un apoyo para la consulta y no reemplaza el criterio del médico.');
  return L.join('\n');
}
