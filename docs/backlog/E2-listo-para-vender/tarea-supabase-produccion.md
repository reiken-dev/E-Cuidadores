# Supabase en producción de punta a punta

**Jira:** ECU-17
**Épica:** E2
**Tipo:** tarea de configuración (la hace el alumno con guía de la IA; sección 2 de `LISTA-DE-CONEXION.md`)

## Pasos
- Ejecutar los SQL en orden en el proyecto real: `schema.sql`, `retencion.sql`, `permisos-service-role.sql`, `datos-reales.sql`, `invitaciones.sql`, `invitaciones-ajustes.sql`, `vigencia-y-correo.sql` y `cron-retencion.sql`.
- Authentication: URL del callback (`https://TU-DOMINIO/auth/callback`, necesita el dominio de ECU-19), «Confirm email» y rate limits.
- SMTP propio (`docs/conexion/GUIA-SMTP-SUPABASE.md`) y todas las plantillas de `supabase/plantillas-correo/`.
- Probar con dos cuentas reales que una no ve los datos de la otra (RLS).
- Recorrido completo: entrar, aceptar, `/bienvenida`, crear círculo (con el simulador de Hotmart), invitar a un hermano y ver sus cambios.
- Probar los correos que faltan: los de Supabase (enlace de acceso, cambio de correo) y la bienvenida, que envía Resend desde el webhook.
- Confirmar y quitar los `[VERIFICAR]` de `docs/conexion/` (`GUIA-SMTP-SUPABASE.md`, `guard-sesion.ts.txt`, `alta-consentimientos.ts.txt`).
- Antes de vender, borrar las filas que dejó el simulador en `subscriptions`, `payment_events` y `pending_purchases`.

## Terminado cuando
Todo lo anterior funciona y `supabase: true` en `lib/marca.ts` (PR aparte).
