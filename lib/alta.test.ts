import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { registrarConsentimientos } from './alta';
import { LEGAL } from './legal';

const usuario = (metadata: Record<string, unknown>) => ({ id: 'u1', user_metadata: metadata }) as unknown as User;

function dbDoble(opciones: { previas?: number; errorLectura?: boolean; errorInsert?: boolean } = {}) {
  const insert = vi.fn().mockResolvedValue({ error: opciones.errorInsert ? { message: 'x' } : null });
  const select = vi
    .fn()
    .mockResolvedValue({ count: opciones.previas ?? 0, error: opciones.errorLectura ? { message: 'x' } : null });
  const from = vi.fn().mockReturnValue({ select, insert });
  return { db: { from } as unknown as SupabaseClient, insert, select, from };
}

describe('registrarConsentimientos', () => {
  it('sin casillas en el metadata (solo entra) no hace nada', async () => {
    const { db, insert } = dbDoble();
    expect(await registrarConsentimientos(db, usuario({}))).toEqual({ ok: true, guardados: false });
    expect(insert).not.toHaveBeenCalled();
  });

  it('con una casilla sin marcar es un error y no inserta', async () => {
    const { db, insert } = dbDoble();
    const r = await registrarConsentimientos(db, usuario({ acepta: { terminos: true, salud: false } }));
    expect(r.ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it('con las dos casillas inserta una fila por finalidad con la versión del texto', async () => {
    const { db, insert } = dbDoble();
    const r = await registrarConsentimientos(db, usuario({ acepta: { terminos: true, salud: true } }));
    expect(r).toEqual({ ok: true, guardados: true });
    expect(insert).toHaveBeenCalledWith([
      { user_id: 'u1', purpose: 'terms_privacy_adult', text_version: LEGAL.version, locale: 'es', origin: 'signup' },
      { user_id: 'u1', purpose: 'health_data', text_version: LEGAL.version, locale: 'es', origin: 'signup' },
    ]);
  });

  it('no duplica si ya hay filas guardadas', async () => {
    const { db, insert } = dbDoble({ previas: 2 });
    const r = await registrarConsentimientos(db, usuario({ acepta: { terminos: true, salud: true } }));
    expect(r).toEqual({ ok: true, guardados: false });
    expect(insert).not.toHaveBeenCalled();
  });

  it('un valor que no es true (p. ej. "true" como texto) cuenta como no marcado', async () => {
    const { db } = dbDoble();
    const r = await registrarConsentimientos(db, usuario({ acepta: { terminos: 'true', salud: true } }));
    expect(r.ok).toBe(false);
  });

  it('error al leer o al insertar devuelve ok:false', async () => {
    const lectura = dbDoble({ errorLectura: true });
    expect((await registrarConsentimientos(lectura.db, usuario({ acepta: { terminos: true, salud: true } }))).ok).toBe(false);
    const escritura = dbDoble({ errorInsert: true });
    expect((await registrarConsentimientos(escritura.db, usuario({ acepta: { terminos: true, salud: true } }))).ok).toBe(false);
  });
});
