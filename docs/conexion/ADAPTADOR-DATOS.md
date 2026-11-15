# Adaptador de datos: del almacenamiento local a Supabase

> **Estado (ECU-5):** el adaptador para el **organizador** ya está escrito. Con `conexiones.supabase = true` en `lib/marca.ts`, `lib/store.ts` hidrata el círculo desde Supabase (`lib/datos/remoto.ts`, `lib/datos/mapeo.ts`) y guarda cada cambio de forma optimista en segundo plano. Sin esa bandera sigue la demostración local. La invitación de hermanos (ECU-9) ya funciona: `supabase/invitaciones.sql`, `/unirme/<código>` y `app/unirme/actions.ts` (`INVITACION_CONECTADA = true`). Falta que vean los cambios de los demás (ECU-10): hasta entonces `SINCRONIZACION_CONECTADA` sigue en `false`.
>
> Qué hay que ejecutar: `supabase/schema.sql`, `retencion.sql`, `permisos-service-role.sql` y **`datos-reales.sql`**, en ese orden. El círculo se crea en `/bienvenida` y exige una suscripción vigente.
>
> Lo que el servidor impone y la pantalla no puede cambiar: una dosis la firma siempre quien tiene la sesión (`registrar_dosis` + trigger), el plan lo escribe solo el webhook de Hotmart, y los miembros los da de alta el servidor.

Hasta ECU-5, todos los datos vivían en el navegador (`lib/store.ts`, en `localStorage`). Para que los hermanos vean lo mismo desde sus teléfonos hay que cambiar **dónde se guardan**, no **las reglas**. Las reglas están en `lib/store.ts` y `lib/schedule.ts`, y se prueban sin navegador.

## Lo que debe cumplir el nuevo almacenamiento

1. **La misma forma de datos**: `AppData` de `lib/types.ts`.
2. **Las mismas acciones**, con las mismas firmas (lista abajo). Las pantallas no deben cambiar.
3. **Las reglas que no se negocian** (ya están en `lib/store.ts`; no las repitas en la base de datos sin probarlas):
   - Una dosis nunca se marca como dada sin decir **quién** y **a qué hora**. `confirmDose` devuelve `false` si falta la persona, si no es del círculo o si los datos no son válidos.
   - `skipDose` solo acepta los motivos de `SKIP_REASONS` (`lib/types.ts`). Un motivo inventado se rechaza.
   - Confirmar dos veces la misma dosis deja una sola confirmación: la última.
   - Editar el horario o pausar una medicina **no reescribe el pasado** (`Med.scheduleFrom`).
   - Borrar la cuenta de la última persona borra el círculo y sus datos de salud: nada queda huérfano (`supabase/schema.sql` lo cumple con claves externas en cascada).
4. **Seguridad**: políticas RLS (ya incluidas en `supabase/schema.sql`). La clave `service_role` nunca va al navegador ni lleva el prefijo `NEXT_PUBLIC_`.
5. **Sincronización real**: cuando los hermanos ya vean los mismos datos, pon `SINCRONIZACION_CONECTADA = true` en `lib/oferta.ts`. Antes, los textos no lo prometen.

## Acciones que debe exponer `actions`

Escritura (todas aceptan los mismos argumentos que hoy):

| Acción | Qué hace |
|---|---|
| `confirmDose`, `skipDose`, `undoDose` | Registrar, anotar como no dada o deshacer una dosis |
| `saveMed`, `toggleMedPause`, `deleteMed` | Medicinas: guardar, pausar o quitar |
| `saveAppt`, `setApptStatus` | Citas: guardar o cambiar su estado y resultado |
| `saveNote`, `deleteNote` | Bitácora |
| `updateProfile`, `setQuestions`, `updateSettings` | Perfil del familiar, preguntas para el médico y ajustes |
| `markSeen`, `markHito` | Recuerdos de visita y de hitos celebrados |
| `setPlan` | Estado de la suscripción (lo actualizará el aviso de pago de Hotmart) |
| `exportarDatos`, `borrarTodo`, `restorePersonalData` | Descargar, borrar o restaurar los datos de la cuenta |
| `resetDemo`, `enterDemo`, `applyOnboarding` | Datos de demostración y alta inicial |

Lectura (hooks y funciones): `useAppData`, `useSeenBefore`, `useNow`, `useUiReady`, `getSnapshot`.

## Cómo comprobar que el adaptador es correcto

- **`lib/store.test.ts`** (40 pruebas) describe las reglas de arriba. Un adaptador debe producir los mismos resultados. Hoy esas pruebas usan el almacenamiento local; para probar otro, hay que sustituir ese almacenamiento por el nuevo sin cambiar las expectativas.
- **`supabase/sql.test.ts`** ya ejecuta `schema.sql` y `retencion.sql` en PostgreSQL real (PGlite), con las reglas de borrado y de retención.
- **Prueba con dos cuentas**: una no debe ver los datos de la otra (RLS). Esto no se puede probar sin tu proyecto de Supabase.

## Lo que todavía no hace

- Ver los cambios de los demás hermanos (ECU-10). Quitar miembros y aprobar el ingreso quedan fuera de ECU-9.
- Borrar el círculo o la cuenta desde la app (derecho de supresión): `borrarTodo` no hace nada en modo remoto.
- El historial de dosis que se carga es de los últimos 120 días (`DIAS_DE_DOSIS` en `lib/datos/remoto.ts`); lo anterior queda en la base.
- Si alguien borra su cuenta, sus dosis y notas se conservan sin nombre propio y la pantalla dice «Alguien de la familia».
- Borrar o deshacer algo que la base rechaza por permisos (suscripción vencida) no devuelve error: la API responde sin filas. La app lo corrige al recargar.
