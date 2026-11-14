# Retención activa sin culpa

**Jira:** pendiente
**Épica:** E1

**Como** dueño del producto, **quiero** que corra el cron de retención, **para** acompañar a quien deja de usar la app sin presionarla.

## Criterios de aceptación
- El cron está protegido con `CRON_SECRET`, que nunca lleva `NEXT_PUBLIC_`.
- Los mensajes no usan la culpa para retener ni cobrar.
- No incluyen datos de salud.

## Notas
- Punto de partida: `docs/retencion/`. Depende del webhook de Hotmart para saber quién está activo.
