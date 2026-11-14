import { describe, expect, it } from 'vitest';
import { cuentaComoIngreso, decimalesDe, esCancelacion, esCobroFallido, estadoDeEvento, extraerAviso, faltaConfiguracionHotmart, fechaDesdeMs, hottokValido, importeContable, planAGuardar } from './hotmart';

describe('configuración del webhook', () => {
  it('lista lo que falta y no inventa nada cuando todo está', () => {
    expect(faltaConfiguracionHotmart({})).toEqual(['HOTMART_HOTTOK', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    expect(faltaConfiguracionHotmart({ HOTMART_HOTTOK: 'x', NEXT_PUBLIC_SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })).toEqual([]);
  });
  it('una variable con solo espacios cuenta como falta (la ruta responde 503, no 401)', () => {
    expect(faltaConfiguracionHotmart({ HOTMART_HOTTOK: '   ', NEXT_PUBLIC_SUPABASE_URL: 'u', SUPABASE_SERVICE_ROLE_KEY: 'k' })).toEqual(['HOTMART_HOTTOK']);
  });
});

describe('estado de la suscripción según el evento', () => {
  it('traduce cada evento conocido', () => {
    expect(estadoDeEvento('PURCHASE_APPROVED')).toBe('active');
    expect(estadoDeEvento('PURCHASE_COMPLETE')).toBe('active');
    expect(estadoDeEvento('PURCHASE_DELAYED')).toBe('past_due');
    expect(estadoDeEvento('SUBSCRIPTION_CANCELLATION')).toBe('canceled');
    expect(estadoDeEvento('PURCHASE_REFUNDED')).toBe('refunded');
    expect(estadoDeEvento('PURCHASE_CHARGEBACK')).toBe('chargeback');
    expect(estadoDeEvento('PURCHASE_EXPIRED')).toBe('expired');
  });
  it('un evento desconocido no cambia nada', () => {
    expect(estadoDeEvento('ALGO_NUEVO')).toBeNull();
    expect(estadoDeEvento('')).toBeNull();
  });
  it('identifica cobro fallido y cancelación para disparar los correos', () => {
    expect(esCobroFallido('PURCHASE_DELAYED')).toBe(true);
    expect(esCobroFallido('PURCHASE_APPROVED')).toBe(false);
    expect(esCancelacion('SUBSCRIPTION_CANCELLATION')).toBe(true);
  });
  it('solo el pago aprobado suma al libro, el reembolso resta y los demás no lo mueven', () => {
    expect(importeContable('PURCHASE_APPROVED', 5999)).toBe(5999);
    expect(importeContable('PURCHASE_COMPLETE', 5999)).toBeNull();
    expect(importeContable('PURCHASE_REFUNDED', 5999)).toBe(-5999);
    expect(importeContable('PURCHASE_APPROVED', null)).toBeNull();
  });
  it('un mismo pago no se cuenta dos veces: solo los avisos de pago cuentan como ingreso', () => {
    expect(cuentaComoIngreso('PURCHASE_COMPLETE')).toBe(false);
    expect(cuentaComoIngreso('PURCHASE_APPROVED')).toBe(true);
    expect(cuentaComoIngreso('PURCHASE_REFUNDED')).toBe(false);
  });
});

describe('verificación del HOTTOK', () => {
  it('acepta solo el valor exacto', () => {
    expect(hottokValido('abc123', 'abc123')).toBe(true);
    expect(hottokValido('abc124', 'abc123')).toBe(false);
    expect(hottokValido('abc12', 'abc123')).toBe(false);
  });
  it('rechaza vacío o ausente aunque el esperado también lo esté', () => {
    expect(hottokValido('', '')).toBe(false);
    expect(hottokValido(undefined, 'x')).toBe(false);
    expect(hottokValido('x', null)).toBe(false);
  });
});

describe('normalizar el aviso', () => {
  const ok = {
    event: 'PURCHASE_APPROVED',
    data: {
      product: { id: 123 },
      buyer: { email: ' Sofia@Ejemplo.com ' },
      purchase: { transaction: 'HP1', price: { value: 59.99, currency_value: 'USD' } },
      subscription: { plan: { name: 'Plan Anual' }, subscriber: { code: 'SUB1' } },
    },
  };
  it('extrae lo necesario con importe entero en centavos', () => {
    expect(extraerAviso(ok)).toEqual({
      evento: 'PURCHASE_APPROVED',
      transaccion: 'HP1',
      correo: 'sofia@ejemplo.com',
      importeMinimo: 5999,
      moneda: 'USD',
      productoId: '123',
      plan: 'anual',
      codigoSuscriptor: 'SUB1',
      finPeriodo: null,
    });
  });
  it('lee la fecha de fin de periodo en milisegundos, si el aviso la trae', () => {
    const conFecha = { ...ok, data: { ...ok.data, date_next_charge: 1736337600000 } };
    expect(extraerAviso(conFecha)?.finPeriodo).toBe('2025-01-08T12:00:00.000Z');
    expect(fechaDesdeMs('1736337600000')).toBe('2025-01-08T12:00:00.000Z');
    expect(fechaDesdeMs('no es fecha')).toBeNull();
    expect(fechaDesdeMs(-5)).toBeNull();
  });
  it('un plan con nombre desconocido no se etiqueta como mensual', () => {
    const raro = { ...ok, data: { ...ok.data, subscription: { plan: { name: 'Paquete familia' } } } };
    expect(extraerAviso(raro)?.plan).toBeNull();
    expect(planAGuardar(extraerAviso(raro)?.plan ?? null)).toBe('desconocido');
    expect(planAGuardar('anual')).toBe('anual');
  });
  it('sin evento, transacción o correo válido devuelve null', () => {
    expect(extraerAviso({})).toBeNull();
    expect(extraerAviso({ ...ok, event: undefined })).toBeNull();
    expect(extraerAviso({ ...ok, data: { ...ok.data, buyer: { email: 'sin-arroba' } } })).toBeNull();
    expect(extraerAviso(null)).toBeNull();
    expect(extraerAviso('texto')).toBeNull();
  });
  it('usa los decimales de cada moneda: el peso colombiano no se multiplica por 100', () => {
    const cop = { ...ok, data: { ...ok.data, purchase: { transaction: 'HP3', price: { value: 50000, currency_value: 'COP' } } } };
    expect(extraerAviso(cop)?.importeMinimo).toBe(50000);
    expect(decimalesDe('USD')).toBe(2);
  });
  it('un importe raro no rompe nada', () => {
    const raro = { ...ok, data: { ...ok.data, purchase: { transaction: 'HP2', price: { value: 'gratis' } } } };
    expect(extraerAviso(raro)?.importeMinimo).toBeNull();
  });
});
