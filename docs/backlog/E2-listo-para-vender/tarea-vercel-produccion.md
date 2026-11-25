# Vercel en producción: dominio y secretos

**Jira:** ECU-19
**Épica:** E2
**Tipo:** tarea de configuración (la hace el alumno con guía de la IA; secciones 1 y 4b de `LISTA-DE-CONEXION.md`)

## Pasos
- Conectar el dominio y poner `NEXT_PUBLIC_SITE_URL` con él (https, no localhost).
- Poner `CRON_SECRET` y `BAJA_SECRET` (32 o más caracteres al azar, distintas entre sí, sin `NEXT_PUBLIC_`).
- Poner en Vercel las variables de Supabase, Hotmart y Resend que hoy solo están en `.env.local`.
- Probar el cron sin enviar nada: `/api/cron/retencion?simular=1` con el secreto.
- Probar la baja (`/baja`) con un correo propio antes de encender `MARKETING_ACTIVO`.

## Terminado cuando
El sitio responde en el dominio, el cron simulado devuelve conteos y la baja funciona.
