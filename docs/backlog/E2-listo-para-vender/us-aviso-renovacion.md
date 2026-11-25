# Aviso antes de la renovación anual

**Jira:** ECU-14
**Épica:** E2

**Como** suscriptor del plan anual, **quiero** recibir un correo 7 días antes de que se renueve, **para** decidir con tiempo si sigo.

## Criterios de aceptación
- Constante `DIAS_AVISO_RENOVACION = 7` en `lib/oferta.ts`.
- El cron diario envía el correo D de `docs/retencion/CORREOS.md` a cada suscripción anual activa cuya fecha de renovación cae dentro de los próximos 7 días.
- Fecha de renovación: `current_period_end`; si falta, la misma fecha de respaldo que usa la vigencia (ECU-8). Toda suscripción anual que vaya a renovarse recibe el aviso.
- Una sola vez por periodo (registro de envíos con clave por periodo).
- Es un correo transaccional: se envía aunque `MARKETING_ACTIVO` sea `false` y aunque la persona se haya dado de baja del marketing.
- Incluye la fecha de renovación, el enlace al panel de Hotmart para ver el importe y cancelar, y el plazo de reembolso de renovación (`RENOVACION_REEMBOLSO_DIAS`). No da una cifra de precio (puede no coincidir con lo que cobra Hotmart). Puede llevar conteos del año, como ECU-6; nunca nombres de medicinas ni del familiar. Sin culpa.
- Pruebas de la selección (con y sin fecha), del texto y de la idempotencia.
- Al terminar, y solo con ECU-12 hecha y el plan anual confirmado con un aviso real (ECU-18), `COMPROMISOS_LEGALES_CUMPLIDOS = true` y se revisan los textos legales que cambian con ese flag.

## Notas
- Necesita Resend activo (ya lo está, ECU-4) y el cron de ECU-6.
- La plantilla D de `docs/retencion/CORREOS.md` se alinea con esta historia (solo 7 días antes).
