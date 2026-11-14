#!/usr/bin/env node
// Simula un aviso de Hotmart contra tu servidor LOCAL, para probar app/api/hotmart/route.ts sin una cuenta de Hotmart.
//
// Uso (con el servidor en marcha: npm run dev):
//   node --env-file=.env.local scripts/simular-hotmart.mjs <EVENTO> <correo> [transaccion] [mensual|anual]
//
// Ejemplos:
//   node --env-file=.env.local scripts/simular-hotmart.mjs PURCHASE_APPROVED ana@correo.com PRUEBA-1 mensual
//   node --env-file=.env.local scripts/simular-hotmart.mjs SUBSCRIPTION_CANCELLATION ana@correo.com PRUEBA-1
//   node --env-file=.env.local scripts/simular-hotmart.mjs PURCHASE_REFUNDED ana@correo.com PRUEBA-1
//
// Eventos que usa la app: PURCHASE_APPROVED, PURCHASE_COMPLETE, PURCHASE_DELAYED, PURCHASE_CANCELED,
// SUBSCRIPTION_CANCELLATION, PURCHASE_EXPIRED, PURCHASE_REFUNDED, PURCHASE_CHARGEBACK.
// Repetir el mismo evento con la misma transacción debe responder "repetido: true".
//
// Lee HOTMART_HOTTOK de tu .env.local (por --env-file) y lo manda en la cabecera. NO lo imprime.
// Solo imprime el código HTTP y la respuesta del servidor. La URL base se puede cambiar con SIMULAR_URL.

const [evento, correo, transaccion = `SIM-${Date.now()}`, plan = 'mensual'] = process.argv.slice(2);
const hottok = process.env.HOTMART_HOTTOK;
const base = process.env.SIMULAR_URL || 'http://localhost:3000';

if (!evento || !correo) {
  console.error('Uso: node --env-file=.env.local scripts/simular-hotmart.mjs <EVENTO> <correo> [transaccion] [mensual|anual]');
  process.exit(1);
}
if (!hottok) {
  console.error('Falta HOTMART_HOTTOK en .env.local (ponle un valor de prueba).');
  process.exit(1);
}
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base) && !process.env.SIMULAR_PERMITIR_REMOTO) {
  console.error('Solo se simula contra tu servidor local. Para otra URL define SIMULAR_PERMITIR_REMOTO=1.');
  process.exit(1);
}

const finDePeriodo = Date.now() + (plan === 'anual' ? 365 : 30) * 864e5;
const cuerpo = {
  event: evento,
  data: {
    purchase: { transaction: transaccion, price: { value: plan === 'anual' ? 99.99 : 9.99, currency_value: 'USD' } },
    buyer: { email: correo },
    product: { id: 'PRODUCTO-DE-PRUEBA' },
    subscription: { plan: { name: plan === 'anual' ? 'Plan Anual' : 'Plan Mensual' }, subscriber: { code: 'SUB-DE-PRUEBA' } },
    date_next_charge: finDePeriodo,
  },
};

try {
  const r = await fetch(`${base}/api/hotmart`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hotmart-hottok': hottok },
    body: JSON.stringify(cuerpo),
  });
  console.log(`${evento} · ${transaccion} → HTTP ${r.status}`, await r.text());
} catch {
  console.error(`No se pudo conectar con ${base}. ¿Está corriendo "npm run dev"?`);
  process.exit(1);
}
