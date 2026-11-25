# Recordatorios de dosis y citas en el teléfono

**Jira:** ECU-16
**Épica:** E2

**Como** hermano que cuida a un familiar, **quiero** recibir un aviso cuando toca una dosis o se acerca una cita, **para** no depender de acordarme.

## Criterios de aceptación
- Un programador llama cada 5 minutos a `/api/cron/recordatorios`, protegida con un secreto propio (`RECORDATORIOS_SECRET`, distinto de `CRON_SECRET`). El cron de Vercel en plan Hobby corre una vez al día, así que la propuesta es `pg_cron` + `pg_net` de Supabase. La alternativa (Vercel Pro o un servicio externo) se decide con el alumno en el PR.
- El secreto vive en Supabase Vault (o en el servicio externo), nunca como literal en `supabase/*.sql` ni en git. Una prueba comprueba que ningún `.sql` lo contiene.
- Las dosis que tocan se calculan en el servidor con `lib/schedule.ts`, en la zona horaria del círculo.
- Dosis: un aviso a su hora, solo si aún no está marcada. Citas: los recordatorios que ya se configuran en `ApptForm`.
- Llega a cada miembro del círculo que activó los avisos (ECU-15). En el momento del envío se comprueba que el destinatario sigue siendo miembro y que el círculo tiene suscripción vigente.
- Idempotente: un registro de avisos enviados evita repetir la misma dosis o cita.
- Ninguna parte del aviso lleva datos de salud: ni título, ni cuerpo, ni `tag`, ni `data`, ni la URL de clic (ni medicina, ni nombre del familiar, ni ids legibles). Ejemplo: «Toca una dosis. Ábrela en la app». El detalle solo se ve dentro de la app.
- Sin datos de salud en logs. Tope por corrida y corte por tiempo.
- Los textos de Hoy y Citas prometen avisos solo cuando el teléfono los tiene activos.
- El aviso no da indicaciones médicas.
- Pruebas del cálculo, de la idempotencia, de la comprobación de membresía y de la ruta.

## Notas
- Depende de: ECU-15, Supabase en producción (ECU-17) y dominio público con sus secretos (ECU-19).
- Cambios de base de datos en un SQL nuevo y con confirmación.
