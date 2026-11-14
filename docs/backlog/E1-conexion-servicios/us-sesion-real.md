# Entrar con una cuenta real

**Jira:** pendiente
**Épica:** E1

**Como** persona que cuida a un familiar, **quiero** crear una cuenta e iniciar sesión, **para** que mis datos estén protegidos y no dependan de mi navegador.

## Criterios de aceptación
- Con Supabase conectado, `sesionDelServidor()` en `lib/sesion.ts` devuelve la sesión real y no `null`.
- `/app` sin sesión redirige a `/entrar`; con sesión, entra.
- Sin Supabase conectado sigue la demostración, con el banner que lo dice.
- Las tablas expuestas tienen RLS activo.
- Ninguna clave de servicio llega al cliente.

## Notas
- Requiere `@supabase/supabase-js` y `@supabase/ssr` (hoy no instalados).
- Cambios de base de datos, en un SQL nuevo y con confirmación.
