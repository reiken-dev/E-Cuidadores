import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { guardarConsentimientos, registrarConsentimientos, tieneConsentimientos } from './alta';
import { LEGAL } from './legal';

const usuario = (metadata: Record<string, unknown>) => ({ id: 'u1', user_metadata: metadata }) as unknown as User;
const AMBAS = [{ purpose: 'terms_privacy_adult' }, { purpose: 'health_data' }];

function dbDoble(opciones: { filas?: { purpose: string }[]; errorLectura?: boolean; errorInsert?: boolean } = {}) {
  const insert = vi.fn().mockResolvedValue({ error: opciones.errorInsert ? { message: 'x' } : null });
  const lectura = { data: opciones.filas ?? [], error: opciones.errorLectura ? { message: 'x' } : null };
  const consulta = { select: vi.fn(), in: vi.fn(), is: vi.fn().mockResolvedValue(lectura) };
  consulta.select.mockReturnValue(consulta);
  consulta.in.mockReturnValue(consulta);
  const from = vi.fn().mockReturnValue({ select: consulta.select, insert });
  return { db: { from } as unknown as SupabaseClient, insert, consulta };
}

describe('tieneConsentimientos', () => {
  it('true solo con las dos finalidades obligatorias vigentes', async () => {
    expect(await tieneConsentimientos(dbDoble({ filas: AMBAS }).db)).toBe(true);
  });
  it('false si falta una', async () => {
    expect(await tieneConsentimientos(dbDoble({ filas: [AMBAS[0]] }).db)).toBe(false);
  });
  it('analytics o marketing no sustituyen a las obligatorias', async () => {
    expect(await tieneConsentimientos(dbDoble({ filas: [{ purpose: 'marketing' }, { purpose: 'analytics' }] }).db)).toBe(false);
  });
  it('consulta solo las obligatorias y no retiradas', async () => {
    const { db, consulta } = dbDoble({ filas: AMBAS });
    await tieneConsentimientos(db);
    expect(consulta.in).toHaveBeenCalledWith('purpose', ['terms_privacy_adult', 'health_data']);
    expect(consulta.is).toHaveBeenCalledWith('withdrawn_at', null);
  });
  it('falla cerrado ante un error de lectura', async () => {
    expect(await tieneConsentimientos(dbDoble({ filas: AMBAS, errorLectura: true }).db)).toBe(false);
  });
});

describe('guardarConsentimientos', () => {
  it('sin las dos casillas no inserta', async () => {
    const { db, insert } = dbDoble();
    expect((await guardarConsentimientos(db, 'u1', { terminos: true, salud: false })).ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
  it('con las dos casillas inserta una fila por finalidad con la versión del texto', async () => {
    const { db, insert } = dbDoble();
    expect(await guardarConsentimientos(db, 'u1', { terminos: true, salud: true })).toEqual({ ok: true, guardados: true });
    expect(insert).toHaveBeenCalledWith([
      { user_id: 'u1', purpose: 'terms_privacy_adult', text_version: LEGAL.version, locale: 'es', origin: 'signup' },
      { user_id: 'u1', purpose: 'health_data', text_version: LEGAL.version, locale: 'es', origin: 'signup' },
    ]);
  });
  it('no duplica si ya están las dos', async () => {
    const { db, insert } = dbDoble({ filas: AMBAS });
    expect(await guardarConsentimientos(db, 'u1', { terminos: true, salud: true })).toEqual({ ok: true, guardados: false });
    expect(insert).not.toHaveBeenCalled();
  });
  it('un consentimiento de marketing previo no impide guardar los obligatorios', async () => {
    const { db, insert } = dbDoble({ filas: [{ purpose: 'marketing' }] });
    expect((await guardarConsentimientos(db, 'u1', { terminos: true, salud: true })).ok).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
  });
  it('error al insertar devuelve ok:false', async () => {
    expect((await guardarConsentimientos(dbDoble({ errorInsert: true }).db, 'u1', { terminos: true, salud: true })).ok).toBe(false);
  });
});

describe('registrarConsentimientos (atajo desde user_metadata)', () => {
  it('sin casillas en el metadata no hace nada', async () => {
    const { db, insert } = dbDoble();
    expect(await registrarConsentimientos(db, usuario({}))).toEqual({ ok: true, guardados: false });
    expect(insert).not.toHaveBeenCalled();
  });
  it('con una casilla sin marcar es un error', async () => {
    const { db, insert } = dbDoble();
    expect((await registrarConsentimientos(db, usuario({ acepta: { terminos: true, salud: false } }))).ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
  it('un valor que no es true (p. ej. "true" como texto) cuenta como no marcado', async () => {
    expect((await registrarConsentimientos(dbDoble().db, usuario({ acepta: { terminos: 'true', salud: true } }))).ok).toBe(false);
  });
  it('con las dos casillas guarda', async () => {
    const { db, insert } = dbDoble();
    expect(await registrarConsentimientos(db, usuario({ acepta: { terminos: true, salud: true } }))).toEqual({ ok: true, guardados: true });
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
