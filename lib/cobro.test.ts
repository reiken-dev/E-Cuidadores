import { describe, expect, it } from 'vitest';
import { destinoDelCobro, planConEnlace } from './cobro';

const SIN_ENLACES = { mensual: null, anual: null };
const SOLO_MENSUAL = { mensual: 'https://pay.hotmart.com/MES', anual: null };
const AMBOS = { mensual: 'https://pay.hotmart.com/MES', anual: 'https://pay.hotmart.com/ANIO' };

describe('planConEnlace (plan que llega seleccionado)', () => {
  it('respeta el pedido cuando tiene enlace', () => {
    expect(planConEnlace('anual', AMBOS)).toBe('anual');
    expect(planConEnlace('mensual', AMBOS)).toBe('mensual');
  });

  it('si solo hay enlace mensual, el anual cambia al mensual (no se abre con error)', () => {
    expect(planConEnlace('anual', SOLO_MENSUAL)).toBe('mensual');
  });

  it('si solo hay enlace anual, el mensual cambia al anual', () => {
    expect(planConEnlace('mensual', { mensual: null, anual: 'https://pay.hotmart.com/ANIO' })).toBe('anual');
  });

  it('en la demostración (sin enlaces) respeta el pedido', () => {
    expect(planConEnlace('anual', SIN_ENLACES)).toBe('anual');
    expect(planConEnlace('mensual', SIN_ENLACES)).toBe('mensual');
  });
});

describe('destinoDelCobro (a dónde va el botón de compra)', () => {
  it('sin enlaces conectados, ambos planes quedan en demo (sin cobro)', () => {
    expect(destinoDelCobro('mensual', SIN_ENLACES)).toEqual({ tipo: 'demo' });
    expect(destinoDelCobro('anual', SIN_ENLACES)).toEqual({ tipo: 'demo' });
  });

  it('con el enlace del plan elegido, manda a Hotmart', () => {
    expect(destinoDelCobro('mensual', SOLO_MENSUAL)).toEqual({ tipo: 'externo', url: 'https://pay.hotmart.com/MES' });
    expect(destinoDelCobro('anual', AMBOS)).toEqual({ tipo: 'externo', url: 'https://pay.hotmart.com/ANIO' });
  });

  it('si falta el enlace del plan elegido, no simula un alta: avisa', () => {
    expect(destinoDelCobro('anual', SOLO_MENSUAL)).toEqual({ tipo: 'sin-enlace' });
  });

  it('nunca cae en el enlace del otro plan', () => {
    const solo = destinoDelCobro('mensual', { mensual: null, anual: 'https://pay.hotmart.com/ANIO' });
    expect(solo).toEqual({ tipo: 'sin-enlace' });
  });
});
