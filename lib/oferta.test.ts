import { describe, expect, it } from 'vitest';
import { GARANTIA_DIAS, MESES_GRATIS_ANUAL, OFERTA_ES_EJEMPLO, PRECIO_ANIO, PRECIO_ANIO_POR_MES, PRECIO_MES, PRECIOS_DE_EJEMPLO, TRIAL_DIAS, tieneTrial, textoMesesGratis, usd } from './oferta';

describe('oferta editable', () => {
  it('la garantía nunca baja del derecho de arrepentimiento de 7 días', () => {
    // Cuenta desde el PRIMER COBRO. Si tu plataforma la contara desde el inicio de la prueba, una garantía igual
    // a la prueba no dejaría margen: verifícalo en Hotmart (ver PARA-LA-IA-DEL-ALUMNO.md, sección 7).
    expect(GARANTIA_DIAS).toBeGreaterThanOrEqual(7);
  });
  it('el anual cuesta menos que doce meses sueltos', () => {
    expect(PRECIO_ANIO).toBeLessThan(PRECIO_MES * 12);
  });
  it('formatea importes en dólares con dos decimales', () => {
    expect(usd(7.99)).toBe('US$7.99');
    expect(PRECIO_ANIO_POR_MES).toBe(usd(PRECIO_ANIO / 12));
  });
  it('el anual equivale a 10 mensualidades y se vende como dos meses gratis', () => {
    expect(Math.round(PRECIO_ANIO * 100)).toBe(Math.round(PRECIO_MES * 100) * 10);
    expect(MESES_GRATIS_ANUAL).toBe(2);
    expect(textoMesesGratis).toBe('2 meses gratis');
  });
  it('los precios terminan en .90 o .99 y la mensualidad cae en el rango de salud o seguimiento personal', () => {
    for (const p of [PRECIO_MES, PRECIO_ANIO]) expect(p.toFixed(2)).toMatch(/\.(90|99)$/);
    expect(PRECIO_MES).toBeGreaterThanOrEqual(4.99);
    expect(PRECIO_MES).toBeLessThanOrEqual(9.99);
  });
  it('tieneTrial refleja los días de prueba', () => {
    expect(tieneTrial).toBe(TRIAL_DIAS > 0);
  });
  it('la marca de ejemplo de la oferta sale de la bandera de configuración', () => {
    expect(OFERTA_ES_EJEMPLO).toBe(PRECIOS_DE_EJEMPLO);
  });
});
