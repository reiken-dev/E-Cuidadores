import { describe, expect, it } from 'vitest';
import { cuentaComoIngreso, debeAplicarEstado, decimalesDe, esCancelacion, esCobroFallido, estadoDeEvento, extraerAviso, faltaConfiguracionHotmart, fechaDesdeMs, hottokValido, importeContable, planAGuardar, productoPermitido } from './hotmart';

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

describe('cancelación de suscripción (formato 2.0.0: sin `purchase` ni `buyer`)', () => {
  const cancelacion = {
    id: 'evt-9',
    event: 'SUBSCRIPTION_CANCELLATION',
    data: {
      product: { id: 123 },
      subscriber: { code: 'SUB9', email: 'Ana@Ejemplo.com' },
      subscription: { id: 77, plan: { name: 'Plan Anual' } },
      cancellation_date: 1736337600000,
      date_next_charge: 1767873600000,
    },
  };
  it('toma el correo de `subscriber` y arma la clave de idempotencia con la suscripción y la fecha de cancelación', () => {
    expect(extraerAviso(cancelacion)).toEqual({
      evento: 'SUBSCRIPTION_CANCELLATION',
      transaccion: 'SUB-77-1736337600000',
      correo: 'ana@ejemplo.com',
      importeMinimo: null,
      moneda: null,
      productoId: '123',
      plan: 'anual',
      codigoSuscriptor: 'SUB9',
      finPeriodo: '2026-01-08T12:00:00.000Z',
    });
  });
  it('sin suscripción ni fecha, usa el id del evento como clave', () => {
    const sinIds = { ...cancelacion, data: { ...cancelacion.data, subscription: { plan: { name: 'Plan Anual' } }, cancellation_date: undefined } };
    expect(extraerAviso(sinIds)?.transaccion).toBe('EVT-evt-9');
  });
  it('sin ninguna clave posible devuelve null', () => {
    const nada = { event: 'SUBSCRIPTION_CANCELLATION', data: { subscriber: { email: 'a@b.co' } } };
    expect(extraerAviso(nada)).toBeNull();
  });
  it('si hay `buyer.email`, manda sobre `subscriber.email`; un correo inválido en buyer no cae al otro', () => {
    const ambos = { ...cancelacion, data: { ...cancelacion.data, buyer: { email: 'comprador@ejemplo.com' } } };
    expect(extraerAviso(ambos)?.correo).toBe('comprador@ejemplo.com');
    const raro = { ...cancelacion, data: { ...cancelacion.data, buyer: { email: 'sin-arroba' } } };
    expect(extraerAviso(raro)).toBeNull();
  });
});

describe('fecha de fin de periodo en texto ISO', () => {
  it('acepta el formato ISO que algún ejemplo oficial usa y rechaza lo raro', () => {
    expect(fechaDesdeMs('2022-09-01T12:00:00.000Z')).toBe('2022-09-01T12:00:00.000Z');
    expect(fechaDesdeMs('2022-13-45T99:00:00Z')).toBeNull();
    expect(fechaDesdeMs('mañana')).toBeNull();
  });
});

describe('producto permitido', () => {
  it('sin HOTMART_PRODUCT_ID no se filtra nada', () => {
    expect(productoPermitido('123', undefined)).toBe(true);
    expect(productoPermitido(null, '')).toBe(true);
    expect(productoPermitido('123', '   ')).toBe(true);
  });
  it('con HOTMART_PRODUCT_ID solo pasa ese producto', () => {
    expect(productoPermitido('123', '123')).toBe(true);
    expect(productoPermitido('123', ' 123 ')).toBe(true);
    expect(productoPermitido('456', '123')).toBe(false);
    expect(productoPermitido(null, '123')).toBe(false);
  });
});

describe('¿el aviso debe cambiar el estado?', () => {
  it('sin historial, todo aviso de alta o de baja se aplica', () => {
    for (const e of ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_DELAYED', 'SUBSCRIPTION_CANCELLATION', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK']) {
      expect(debeAplicarEstado(e, [])).toBe(true);
    }
  });
  it('un aviso de alta tras un reembolso o contracargo de la misma transacción no devuelve el acceso', () => {
    for (const previo of ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK']) {
      for (const e of ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_DELAYED']) {
        expect(debeAplicarEstado(e, ['PURCHASE_APPROVED', previo])).toBe(false);
      }
    }
  });
  it('el reembolso y la baja siempre se aplican, incluso si ya hubo otro', () => {
    expect(debeAplicarEstado('PURCHASE_REFUNDED', ['PURCHASE_CHARGEBACK'])).toBe(true);
    expect(debeAplicarEstado('SUBSCRIPTION_CANCELLATION', ['PURCHASE_REFUNDED'])).toBe(true);
  });
  it('cancelado o vencido solo cuenta si esa transacción se pagó antes', () => {
    expect(debeAplicarEstado('PURCHASE_CANCELED', [])).toBe(false);
    expect(debeAplicarEstado('PURCHASE_EXPIRED', ['PURCHASE_DELAYED'])).toBe(false);
    expect(debeAplicarEstado('PURCHASE_CANCELED', ['PURCHASE_APPROVED'])).toBe(true);
    expect(debeAplicarEstado('PURCHASE_EXPIRED', ['PURCHASE_COMPLETE'])).toBe(true);
  });
});
