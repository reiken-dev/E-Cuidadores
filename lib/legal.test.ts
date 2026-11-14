import { describe, expect, it } from 'vitest';
import { COMPROMISOS_LEGALES_CUMPLIDOS, LEGAL, emailLegal } from './legal';
import { avisoMedico, cookies, privacidad, reembolsos, terminos } from './legal-textos';
import { DATOS_CONSERVACION_CONFIRMADA, DIAS_CONSERVAR_DATOS, GARANTIA_DIAS, RENOVACION_REEMBOLSO_DIAS, TRIAL_DIAS, tieneTrial } from './oferta';
import { MARCA } from './marca';

const plano = (t: ReturnType<typeof privacidad>) =>
  [t.intro, t.aviso?.texto ?? '', ...t.secciones.flatMap((s) => [s.title, ...s.blocks.map((b) => (typeof b === 'string' ? b : b.list.join(' '))) ])].join('\n');

const todos = { privacidad: privacidad(), terminos: terminos(), reembolsos: reembolsos(), cookies: cookies(), aviso: avisoMedico() };

describe('coherencia legal ↔ oferta', () => {
  it('la garantía y la prueba salen de lib/oferta.ts en los documentos', () => {
    expect(plano(todos.reembolsos)).toContain(`${GARANTIA_DIAS} días`);
    if (tieneTrial) {
      expect(plano(todos.reembolsos)).toContain(`${TRIAL_DIAS} días`);
      expect(plano(todos.terminos)).toContain(`${TRIAL_DIAS} días`);
    }
  });
  it('la garantía nunca baja del derecho de retracto de 7 días y supera a la prueba', () => {
    expect(GARANTIA_DIAS).toBeGreaterThanOrEqual(7);
    expect(RENOVACION_REEMBOLSO_DIAS).toBeGreaterThanOrEqual(7);
  });
  it('la conservación de datos sigue la bandera de lib/oferta.ts: plazo solo si está confirmada', () => {
    const t = plano(todos.privacidad);
    if (DATOS_CONSERVACION_CONFIRMADA) expect(t).toContain(`conservamos la información hasta ${DIAS_CONSERVAR_DATOS} días`);
    else expect(t).not.toMatch(/conservamos la información hasta/);
  });
  it('los términos informan renovación automática y cancelación; el aviso anual solo si el compromiso está cumplido', () => {
    const t = plano(todos.terminos);
    expect(t).toMatch(/Renovación automática/);
    expect(t).toMatch(/Tu suscripción/);
    if (COMPROMISOS_LEGALES_CUMPLIDOS) expect(t).toMatch(/Aviso de renovación anual/);
    else expect(t).not.toMatch(/Aviso de renovación anual/);
  });
  it('la cookie de sesión solo se menciona con Supabase conectado', () => {
    const t = plano(todos.cookies);
    if (MARCA.conexiones.supabase) expect(t).toMatch(/cookie de sesión/);
    else expect(t).not.toMatch(/cookie de sesión/);
  });
});

describe('privacidad completa', () => {
  const t = plano(todos.privacidad);
  it('nombra a cada tercero con su función, o dice que hoy ninguno recibe datos', () => {
    const hayProveedores = MARCA.conexiones.supabase || MARCA.conexiones.resend || MARCA.conexiones.hotmart;
    if (hayProveedores) {
      for (const p of LEGAL.proveedores) {
        expect(t).toContain(p.nombre);
        expect(t).toContain(p.funcion);
      }
    } else {
      expect(t).toMatch(/no enviamos tus datos a ningún proveedor/);
      expect(t).not.toContain('Supabase');
    }
  });
  it('no promete que el círculo ve los datos mientras no hay sincronización', () => {
    if (!MARCA.conexiones.supabase) expect(t).not.toMatch(/solo lo ve tu círculo/);
  });
  it('cubre transferencia internacional, derechos, menores, salud y cambios', () => {
    expect(t).toMatch(/Transferencias a otros países/);
    expect(t).toMatch(/Tus derechos/);
    expect(t).toMatch(/mayores de 18/);
    expect(t).toMatch(/datos de salud/i);
    expect(t).toMatch(/Cambios a esta política/);
    expect(t).toContain(emailLegal);
  });
  it('declara si usa IA de forma coherente con la configuración', () => {
    expect(t).toMatch(LEGAL.usaIA ? /inteligencia artificial/ : /No usamos inteligencia artificial/);
  });
  it('la fecha de actualización existe', () => {
    expect(LEGAL.actualizado.length).toBeGreaterThan(8);
  });
});

describe('aviso médico y cookies', () => {
  it('el aviso médico dice que no diagnostica, no receta y remite a urgencias', () => {
    const t = plano(todos.aviso);
    expect(t).toMatch(/no diagnostica/i);
    expect(t).toMatch(/receta/i);
    expect(t).toMatch(/emergencias/i);
  });
  it('cookies describe la medición según la bandera', () => {
    expect(plano(todos.cookies)).toMatch(LEGAL.analiticaNoEsencial ? /solo se activa si pulsas "Aceptar"/ : /No usamos cookies de publicidad/);
  });
});

describe('sin promesas que la plantilla no cumple', () => {
  it('ningún documento usa culpa ni garantiza resultados de salud', () => {
    for (const t of Object.values(todos)) {
      expect(plano(t)).not.toMatch(/te garantizamos|curar|cura |sin riesgo/i);
    }
  });
  it('la privacidad no promete conservar 30 días (valor viejo)', () => {
    expect(plano(todos.privacidad)).not.toMatch(/hasta 30 días/);
  });
});
