# Datos reales en Supabase para el organizador

**Jira:** ECU-5
**Épica:** E1

**Como** persona que cuida a un familiar, **quiero** que mis medicinas, dosis, citas y bitácora se guarden en mi cuenta y no solo en mi navegador, **para** no perderlas y que solo mi familia las vea.

## Criterios de aceptación
- Migración nueva `supabase/datos-reales.sql` (no edita `schema.sql` ni `retencion.sql`).
- Medicinas, dosis, citas, bitácora y perfil viven en Supabase y no solo en el navegador (`lib/store.ts`).
- Cada familia ve solo lo suyo (RLS), probado con dos cuentas.
- Estados de carga y de error al leer y al guardar.
- El círculo y la primera medicina se crean tras iniciar sesión y aceptar, en `/bienvenida`.
- Sin suscripción vigente se explica con claridad.
- Ningún texto habla de sincronización todavía (ECU-10 la activó después, por sondeo cada 30 s).
- El modo demostración queda intacto con Supabase desconectado.

## Notas
- Depende de: sesión real (ECU-2) y webhook de Hotmart (ECU-3), porque crear un círculo exige una suscripción vigente.
- Parte 1 de la sincronización entre hermanos. Las partes siguientes son ECU-9 (invitar hermanos) y ECU-10 (ver los cambios de los demás).
- Cambios de base de datos, en un SQL nuevo y con confirmación.
- Incluye cerrar la sesión de verdad (hoy el botón solo navegaba a `/entrar`), con recarga completa para no dejar datos en memoria.
