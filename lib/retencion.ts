// RETENCIÓN — la lógica que hace que la app se vuelva imprescindible, calculada SOLO con lo que la
// familia ya registró (funciones puras: el "ahora" entra como parámetro).
//
// Principios (docs/retencion/ESTRATEGIA.md):
//  · Retiene dando valor real, nunca culpa: nada de "nos abandonaste" ni de rachas en rojo.
//  · La racha premia el REGISTRO COMPLETO (dada u omitida con motivo), así que decir la verdad
//    ("hoy no se la tomó") también suma y nadie se ve tentado a confirmar una dosis que no se dio.
//  · Es una racha del CÍRCULO: cuenta lo que registra cualquiera de los hermanos.
//  · Comodines: un día incompleto no rompe la racha si hay un comodín (se gana 1 por cada 7 días, máx. 2).

import { addDays, atTime, keyFromMs } from './dates';
import { dosesOn, nameOf } from './schedule';
import type { Appt, AppData, Note, Plan } from './types';

const DIA = 86400000;

export type EstadoDia = 'completo' | 'incompleto' | 'abierto' | 'sin_dosis';

/** ¿Quedó registrada cada dosis de ese día? (dada u omitida con motivo). */
export function estadoDia(data: AppData, k: string, nowMs: number): EstadoDia {
  const dosis = dosesOn(data, k, nowMs);
  if (dosis.length === 0) return 'sin_dosis';
  if (dosis.every((d) => d.log)) return 'completo';
  return k === keyFromMs(nowMs) ? 'abierto' : 'incompleto';
}

export interface Racha {
  /** Días seguidos con el registro completo (incluye hoy si ya está completo). */
  dias: number;
  mejor: number;
  comodines: number;
  /** Se usó un comodín para cubrir un día incompleto desde la última vez (para avisarlo con calma). */
  comodinReciente: boolean;
  hoyCompleto: boolean;
}

function primerDia(data: AppData, todayK: string, ventana: number): string | null {
  const marcas = [...data.meds.filter((m) => !m.paused).map((m) => m.startAt), ...data.doses.map((d) => d.at)].filter((n) => n > 0);
  if (marcas.length === 0) return null;
  const k = keyFromMs(Math.min(...marcas));
  const limite = addDays(todayK, -ventana);
  return k < limite ? limite : k;
}

export function racha(data: AppData, nowMs: number, ventana = 365): Racha {
  const todayK = keyFromMs(nowMs);
  const vacio: Racha = { dias: 0, mejor: 0, comodines: 0, comodinReciente: false, hoyCompleto: false };
  const inicio = primerDia(data, todayK, ventana);
  if (!inicio) return vacio;
  let dias = 0;
  let mejor = 0;
  let comodines = 0;
  let comodinReciente = false;
  const sube = () => {
    dias += 1;
    mejor = Math.max(mejor, dias);
    if (dias % 7 === 0) comodines = Math.min(2, comodines + 1);
  };
  for (let k = inicio; k < todayK; k = addDays(k, 1)) {
    const e = estadoDia(data, k, nowMs);
    if (e === 'completo') {
      sube();
      comodinReciente = false;
    } else if (e === 'incompleto') {
      if (comodines > 0) {
        comodines -= 1;
        comodinReciente = true;
      } else {
        dias = 0;
      }
    }
  }
  const hoyCompleto = estadoDia(data, todayK, nowMs) === 'completo';
  if (hoyCompleto) sube();
  return { dias, mejor, comodines, comodinReciente, hoyCompleto };
}

/* ── La semana del círculo ── */

export interface DiaSemana {
  k: string;
  estado: EstadoDia;
  dadas: number;
  omitidas: number;
}

export interface Semana {
  desde: string;
  hasta: string;
  dias: DiaSemana[]; // del más antiguo a hoy
  dadas: number;
  omitidas: number;
  esperadas: number;
  /** Dosis registradas (dadas + no dadas con motivo) sobre las esperadas. Decir la verdad nunca baja este número. */
  pct: number | null;
  diasCompletos: number;
  diasConDosis: number;
  porMiembro: { id: string; nombre: string; dadas: number }[];
  notas: Note[];
  citasAtendidas: Appt[];
  proximasCitas: Appt[];
}

export function semana(data: AppData, nowMs: number): Semana {
  const hasta = keyFromMs(nowMs);
  const desde = addDays(hasta, -6);
  const dias: DiaSemana[] = [];
  let dadas = 0;
  let omitidas = 0;
  let esperadas = 0;
  const conteo = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const k = addDays(hasta, -i);
    const dosis = dosesOn(data, k, nowMs);
    let d = 0;
    let o = 0;
    for (const x of dosis) {
      if (x.log) {
        if (x.log.skipped) o++;
        else {
          d++;
          conteo.set(x.log.byId, (conteo.get(x.log.byId) ?? 0) + 1);
        }
        esperadas++;
      } else if (x.status === 'atrasada') esperadas++;
    }
    dadas += d;
    omitidas += o;
    dias.push({ k, estado: estadoDia(data, k, nowMs), dadas: d, omitidas: o });
  }
  const inicioMs = atTime(desde, '00:00');
  const proximas = data.appts
    .filter((a) => a.status === 'pendiente' && a.date >= hasta && a.date <= addDays(hasta, 7))
    .sort((a, b) => atTime(a.date, a.time) - atTime(b.date, b.time));
  return {
    desde,
    hasta,
    dias,
    dadas,
    omitidas,
    esperadas,
    pct: esperadas > 0 ? Math.round(((dadas + omitidas) / esperadas) * 100) : null,
    diasCompletos: dias.filter((d) => d.estado === 'completo').length,
    diasConDosis: dias.filter((d) => d.estado !== 'sin_dosis').length,
    // En el orden del círculo, no por cantidad: agradecer, no comparar.
    porMiembro: [...conteo.entries()]
      .map(([id, n]) => ({ id, nombre: nameOf(data, id), dadas: n }))
      .sort((a, b) => data.members.findIndex((m) => m.id === a.id) - data.members.findIndex((m) => m.id === b.id)),
    notas: data.notes.filter((n) => n.at >= inicioMs).sort((a, b) => b.at - a.at),
    citasAtendidas: data.appts.filter((a) => a.status === 'atendida' && a.date >= desde && a.date <= hasta),
    proximasCitas: proximas,
  };
}

/* ── Hitos: se celebran una sola vez, con calma ── */

export interface Hito {
  id: string;
  titulo: string;
  mensaje: string;
}

export function hitosLogrados(data: AppData, nowMs: number): Hito[] {
  const r = racha(data, nowMs);
  const dadas = data.doses.filter((d) => !d.skipped).length;
  const lista: Hito[] = [];
  if (dadas >= 1)
    lista.push({ id: 'primera_dosis', titulo: 'Primera dosis con nombre', mensaje: 'Ya quedó escrito quién la dio y a qué hora. Nadie tiene que volver a preguntarlo.' });
  if (data.members.length >= 2)
    lista.push({ id: 'circulo_2', titulo: 'Ya no cuidan solos', mensaje: 'Hay más de una persona en el círculo: el cuidado se reparte.' });
  if (data.appts.some((a) => a.status === 'atendida'))
    lista.push({ id: 'primera_cita', titulo: 'Una cita con todo listo', mensaje: 'Llegaron a la consulta con el resumen en la mano.' });
  if (r.mejor >= 7)
    lista.push({ id: 'racha_7', titulo: 'Una semana con el registro completo', mensaje: 'Siete días seguidos sin dudas de «¿ya se la dieron?».' });
  if (dadas >= 100)
    lista.push({ id: 'dosis_100', titulo: '100 dosis con nombre', mensaje: 'Cien veces que alguien del círculo estuvo ahí.' });
  if (r.mejor >= 30)
    lista.push({ id: 'racha_30', titulo: 'Un mes cuidando en círculo', mensaje: 'Treinta días seguidos con todo registrado. Eso es constancia de familia.' });
  if (r.mejor >= 100)
    lista.push({ id: 'racha_100', titulo: '100 días con el registro completo', mensaje: 'Cien días. Lo que hoy es rutina, antes era una preocupación.' });
  return lista;
}

export function hitosNuevos(data: AppData, nowMs: number): Hito[] {
  return hitosLogrados(data, nowMs).filter((h) => !data.hitos.includes(h.id));
}

/* ── Mientras no estabas ── */

export interface Novedades {
  horas: number;
  /** Más de dos semanas sin abrir: se ofrece retomar, no se reclama. */
  reingreso: boolean;
  dosis: { nombre: string; n: number }[];
  omitidas: number;
  notas: Note[];
  total: number;
  /** La dosis más reciente que dio otra persona (para contarla con nombre y hora, no solo "una dosis"). */
  ultima: { nombre: string; medicina: string; at: number } | null;
}

export function novedades(data: AppData, desdeMs: number, nowMs: number): Novedades | null {
  if (desdeMs <= 0) return null;
  const horas = (nowMs - desdeMs) / 3600000;
  if (horas < 4) return null;
  const conteo = new Map<string, number>();
  let omitidas = 0;
  let ultima: Novedades['ultima'] = null;
  for (const d of data.doses) {
    if (d.at <= desdeMs || d.byId === data.currentUserId) continue;
    if (d.skipped) omitidas++;
    else {
      conteo.set(d.byId, (conteo.get(d.byId) ?? 0) + 1);
      if (!ultima || d.at > ultima.at) ultima = { nombre: nameOf(data, d.byId), medicina: data.meds.find((m) => m.id === d.medId)?.name ?? 'una dosis', at: d.at };
    }
  }
  const notas = data.notes.filter((n) => n.at > desdeMs && n.authorId !== data.currentUserId).sort((a, b) => b.at - a.at);
  const dosis = [...conteo.entries()].map(([id, n]) => ({ nombre: nameOf(data, id), n })).sort((a, b) => b.n - a.n);
  const total = dosis.reduce((s, x) => s + x.n, 0) + omitidas + notas.length;
  if (total === 0) return null;
  return { horas, reingreso: horas >= 14 * 24, dosis, omitidas, notas, total, ultima };
}

/* ── Valor recibido (para la pantalla de la suscripción y los correos de renovación) ── */

export interface Valor {
  dias: number;
  dosis: number;
  diasCompletos: number;
  citasAtendidas: number;
  notas: number;
  hermanos: number;
}

export function valorRecibido(data: AppData, nowMs: number, dias = 30): Valor {
  const hoy = keyFromMs(nowMs);
  const desde = addDays(hoy, -(dias - 1));
  const desdeMs = atTime(desde, '00:00');
  let diasCompletos = 0;
  for (let i = 0; i < dias; i++) if (estadoDia(data, addDays(hoy, -i), nowMs) === 'completo') diasCompletos++;
  return {
    dias,
    dosis: data.doses.filter((d) => !d.skipped && d.at >= desdeMs).length,
    diasCompletos,
    citasAtendidas: data.appts.filter((a) => a.status === 'atendida' && a.date >= desde && a.date <= hoy).length,
    notas: data.notes.filter((n) => n.at >= desdeMs).length,
    hermanos: Math.max(0, data.members.length - 1),
  };
}

/* ── Suscripción ── */

export function diasDeSuscripcion(plan: Plan, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - plan.desde) / DIA));
}

/** El primer mes decide la renovación del plan anual: ahí se cuida más la activación. */
export function esPrimerMes(plan: Plan, nowMs: number): boolean {
  return diasDeSuscripcion(plan, nowMs) < 30;
}

/** Se sugiere el plan anual a quien paga mensual, una vez que ya vio valor (2 semanas o más). */
export function ofrecerAnual(plan: Plan, nowMs: number): boolean {
  return plan.tipo === 'mensual' && plan.estado === 'activo' && diasDeSuscripcion(plan, nowMs) >= 14;
}
