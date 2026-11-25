# Borrado automático de datos tras cancelar

**Jira:** ECU-13
**Épica:** E2

**Como** persona que canceló su suscripción, **quiero** que mis datos se borren pasados `DIAS_CONSERVAR_DATOS` días (90), **para** que no se queden en el servidor para siempre y, si vuelvo antes, no perder nada.

## Criterios de aceptación
- El cron diario borra, con el mismo borrado de ECU-12 (círculo y después cuenta):
  - organizadores cuya última suscripción está en un estado terminal (`canceled`, `expired`, `refunded` o `chargeback`) con `current_period_end` conocida y más de `DIAS_CONSERVAR_DATOS` días en el pasado;
  - círculos huérfanos (`created_by` nulo), tras un fallo parcial o un borrado manual en Auth.
- Nunca borra una suscripción `trial`, `active` o `past_due`, ni una sin `current_period_end`, aunque haya dejado de estar vigente por la fecha de respaldo (un aviso de Hotmart perdido no puede borrar a quien sigue pagando). Esos casos se cuentan aparte para revisarlos a mano.
- El plazo se cuenta desde `current_period_end`, nunca desde `updated_at`.
- Si la persona vuelve a pagar antes del plazo, no se borra nada.
- Idempotente, con tope por corrida y corte por tiempo, como el cron de ECU-6.
- `?simular=1` cuenta los candidatos sin borrar.
- Logs solo con conteos: sin nombres, correos ni datos de salud.
- La consulta va en un SQL nuevo, con pruebas en `supabase/sql.test.ts` (incluidos los casos que no se deben borrar).
- Al terminar, `DATOS_CONSERVACION_CONFIRMADA = true` y los textos legales dan el plazo.

## Notas
- Depende de: ECU-12 (reutiliza el borrado) y ECU-18 (estados terminales confirmados con avisos reales de Hotmart).
- Antes de encenderlo en producción, limpiar las suscripciones creadas con el simulador (ECU-17).
- Fuera de alcance: un correo de aviso antes del borrado.
