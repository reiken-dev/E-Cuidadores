# Recordatorios de dosis y citas en el teléfono

**Jira:** ECU-16
**Épica:** E2

**Como** hermano que cuida a un familiar, **quiero** recibir un aviso cuando toca una dosis o se acerca una cita, **para** no depender de acordarme.

## Criterios de aceptación
- Un programador llama cada 5 minutos a `/api/cron/recordatorios`, protegida con `CRON_SECRET`. El cron de Vercel en plan Hobby corre una vez al día, así que la propuesta es `pg_cron` + `pg_net` de Supabase. La alternativa (Vercel Pro o un servicio externo) se decide con el alumno en el PR.
- Las dosis que tocan se calculan en el servidor con `lib/schedule.ts`, en la zona horaria del círculo.
- Dosis: un aviso a su hora, solo si aún no está marcada. Citas: los recordatorios que ya se configuran en `ApptForm`.
- Llega a cada miembro del círculo que activó los avisos (ECU-15).
- Idempotente: un registro de avisos enviados evita repetir la misma dosis o cita.
- El texto visible en la pantalla bloqueada no lleva datos de salud: ni medicina ni nombre del familiar («Toca una dosis. Ábrela en la app»). El detalle solo se ve dentro de la app.
- Sin datos de salud en logs. Tope por corrida y corte por tiempo.
- Los textos de Hoy y Citas prometen avisos solo cuando el teléfono los tiene activos.
- El aviso no da indicaciones médicas.
- Pruebas del cálculo, de la idempotencia y de la ruta.

## Notas
- Depende de: ECU-15 y Supabase en producción (ECU-17).
- Cambios de base de datos en un SQL nuevo y con confirmación.
