# Ver los cambios de mis hermanos

**Jira:** ECU-10
**Épica:** E1

**Como** hermano o hermana que comparte el cuidado, **quiero** ver lo que anotan los demás, **para** coordinarnos sin llamarnos.

## Criterios de aceptación
- La app recarga al abrir, al volver a la pestaña y cada 30 s mientras está visible.
- No pisa lo que la persona está editando.
- Un cambio de una persona aparece en la otra en menos de ~30 s, probado con dos cuentas.
- `SINCRONIZACION_CONECTADA` pasa a `true` y los textos «todos lo ven» pasan a ser ciertos.

## Notas
- Depende de: datos reales en Supabase (ECU-5) e invitar a un hermano (ECU-9).
- Decisión del alumno: sin websockets (se descartó Supabase Realtime por ahora), así que la CSP no abre `wss://`.
