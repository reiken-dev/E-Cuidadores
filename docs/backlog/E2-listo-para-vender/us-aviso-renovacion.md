# Aviso antes de la renovación anual

**Jira:** ECU-14
**Épica:** E2

**Como** suscriptor del plan anual, **quiero** recibir un correo 7 días antes de que se renueve, **para** decidir con tiempo si sigo.

## Criterios de aceptación
- Constante `DIAS_AVISO_RENOVACION = 7` en `lib/oferta.ts`.
- El cron diario envía el correo D de `docs/retencion/CORREOS.md` a cada suscripción anual activa cuya fecha de fin cae dentro de los próximos 7 días.
- Una sola vez por periodo (registro de envíos con clave por periodo).
- Es un correo transaccional: se envía aunque `MARKETING_ACTIVO` sea `false` y aunque la persona se haya dado de baja del marketing.
- Incluye la fecha de renovación, el precio de `lib/oferta.ts`, el enlace al panel de Hotmart para cancelar y el plazo de reembolso de renovación (`RENOVACION_REEMBOLSO_DIAS`). Sin datos de salud y sin culpa.
- Sin fecha de fin, no se envía y se cuenta aparte.
- Pruebas de la selección, del texto y de la idempotencia.
- Al terminar (con ECU-12 hecha), `COMPROMISOS_LEGALES_CUMPLIDOS = true` y se revisan los textos legales que cambian con ese flag.

## Notas
- Necesita Resend activo (ya lo está, ECU-4) y el cron de ECU-6.
