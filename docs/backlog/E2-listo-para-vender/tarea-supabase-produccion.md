# Supabase en producción de punta a punta

**Jira:** ECU-17
**Épica:** E2
**Tipo:** tarea de configuración (la hace el alumno con guía de la IA; sección 2 de `LISTA-DE-CONEXION.md`)

## Pasos
- Ejecutar los SQL en orden en el proyecto real: `schema.sql`, `retencion.sql`, `permisos-service-role.sql`, `datos-reales.sql`, `invitaciones.sql`, `invitaciones-ajustes.sql`, `vigencia-y-correo.sql` y `cron-retencion.sql`.
- Authentication: URL del callback (`https://TU-DOMINIO/auth/callback`), «Confirm email», rate limits y SMTP propio (`docs/conexion/GUIA-SMTP-SUPABASE.md`) con las plantillas de `supabase/plantillas-correo/`.
- Probar con dos cuentas reales que una no ve los datos de la otra (RLS).
- Recorrido completo: entrar, aceptar, `/bienvenida`, crear círculo (con el simulador de Hotmart), invitar a un hermano y ver sus cambios.
- Probar los correos que faltan: bienvenida, enlace de acceso y cambio de correo.

## Terminado cuando
Todo lo anterior funciona y `supabase: true` en `lib/marca.ts` (PR aparte).
