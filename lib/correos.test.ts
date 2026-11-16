import { describe, expect, it } from 'vitest';
import { PLANTILLAS, limpiar, renderCorreo, VARIABLES, type SecuenciaId } from './correos';

const ids = Object.keys(PLANTILLAS) as SecuenciaId[];
const baja = 'https://ejemplo.com/baja?t=firma';

describe('correos de retención', () => {
  it('rellena las variables y arma el enlace del botón', () => {
    const c = renderCorreo('primera_semana', { familiar: 'Rosa', n: 12 }, { bajaUrl: baja });
    expect(c.asunto).toBe('Ya van 12 dosis con nombre y hora');
    expect(c.texto).toContain('círculo de Rosa');
    expect(c.boton.url.endsWith('/app/semana')).toBe(true);
  });
  it('los de retención exigen enlace de baja y lo incluyen', () => {
    expect(() => renderCorreo('pagador_fantasma', { familiar: 'Rosa', dosis: 40 })).toThrow();
    const c = renderCorreo('pagador_fantasma', { familiar: 'Rosa', dosis: 40 }, { bajaUrl: baja });
    expect(c.texto).toContain(baja);
  });
  it('los de cuenta y cobro no llevan baja', () => {
    const c = renderCorreo('pago_fallido', {});
    expect(c.bajaUrl).toBeNull();
    expect(c.texto).toContain('Actualiza tu medio de pago');
    expect(c.texto).not.toMatch(/\{\{|\d+ días/);
  });
  it('limpia saltos de línea y HTML en los valores', () => {
    expect(limpiar('Ana\r\nBcc: x@y.com <b>')).toBe('Ana Bcc: x@y.com b');
    const c = renderCorreo('bienvenida', { nombre: 'A\nB<script>', familiar: 'Rosa' });
    expect(c.asunto).not.toMatch(/[\n<>]/);
  });
  it('los correos que salen del servidor sin círculo (bienvenida, cobro, cancelación) no llevan el nombre del familiar', () => {
    for (const id of ['bienvenida', 'pago_fallido', 'cancelacion'] as const) {
      const c = renderCorreo(id, { nombre: 'Ana', familiar: 'Rosa' });
      expect(`${c.asunto} ${c.texto}`).not.toContain('Rosa');
      expect(`${c.asunto} ${c.texto}`).not.toMatch(/\{\{/);
    }
  });
  it('ninguna plantilla usa variables fuera de la lista blanca ni deja huecos sin valor', () => {
    for (const id of ids) {
      const p = PLANTILLAS[id];
      const usadas = [p.asunto, ...p.cuerpo].join(' ').match(/\{\{(\w+)\}\}/g) ?? [];
      for (const u of usadas) expect(VARIABLES as readonly string[]).toContain(u.slice(2, -2));
    }
  });
  it('sin culpa ni presión: nada de "te extrañamos", "última oportunidad" ni mayúsculas de alarma', () => {
    for (const id of ids) {
      const t = [PLANTILLAS[id].asunto, ...PLANTILLAS[id].cuerpo].join(' ');
      expect(t).not.toMatch(/te extra|última oportunidad|abandon|no nos dejes|urgente/i);
      expect(t).not.toMatch(/medicin|pastilla|losart|metformin/i);
    }
  });
});
