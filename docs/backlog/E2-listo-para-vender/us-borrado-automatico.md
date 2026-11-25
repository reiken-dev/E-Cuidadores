# Borrado automático de datos tras cancelar

**Jira:** ECU-13
**Épica:** E2

**Como** persona que canceló su suscripción, **quiero** que mis datos se borren pasados `DIAS_CONSERVAR_DATOS` días (90), **para** que no se queden en el servidor para siempre y, si vuelvo antes, no perder nada.

## Criterios de aceptación
- El cron diario busca círculos cuyo organizador no tiene suscripción vigente desde hace más de `DIAS_CONSERVAR_DATOS` días y los borra con el mismo borrado de ECU-12.
- Si la persona vuelve a pagar antes del plazo, no se borra nada.
- Idempotente, con tope por corrida y corte por tiempo, como el cron de ECU-6.
- `?simular=1` cuenta los candidatos sin borrar.
- Logs solo con conteos: sin nombres, correos ni datos de salud.
- La consulta va en un SQL nuevo, con pruebas en `supabase/sql.test.ts`.
- Al terminar, `DATOS_CONSERVACION_CONFIRMADA = true` y los textos legales dan el plazo.

## Notas
- Depende de: ECU-12 (reutiliza el borrado).
- Fuera de alcance: un correo de aviso antes del borrado.
