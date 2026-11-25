# Cerrar mi cuenta desde la app

**Jira:** ECU-12
**Épica:** E2

**Como** persona que usa la app (organizador o hermano), **quiero** cerrar mi cuenta desde la app, **para** que mis datos dejen de estar en el servidor sin tener que escribir un correo.

## Criterios de aceptación
- En «Tu suscripción» hay un botón «Cerrar mi cuenta». Para confirmar hay que escribir una palabra (por ejemplo «CERRAR»). Objetivos táctiles de 44 px o más y foco visible.
- Antes de confirmar, la pantalla avisa sin culpa:
  - que cerrar la cuenta no cancela el cobro en Hotmart, con enlace al panel de Hotmart (`NEXT_PUBLIC_HOTMART_PANEL_URL`);
  - si es organizador, que también se borra lo que anotaron sus hermanos en el círculo y que ellos pierden el acceso.
- El cierre es una Server Action (o un POST que comprueba `Origin`), solo para quien tiene la sesión.
- Si es organizador, en una sola transacción y **antes** de borrar el usuario de Auth: se borran el círculo y todos sus datos (medicinas, dosis, citas, bitácora, invitaciones, suscripciones push). Hace falta porque `circles.created_by` es `on delete set null` (`supabase/schema.sql`): borrar solo el usuario dejaría el círculo huérfano con sus datos de salud.
- Si es miembro: sale del círculo, y sus suscripciones push se borran.
- Después se borra el usuario de Supabase Auth con la clave de servicio (con él caen en cascada sus consentimientos; la historia lo documenta).
- Qué pasa con `payment_events` y `pending_purchases` (guardan el correo sin FK a `auth.users`): se decide con el alumno qué se conserva como registro de ingresos y por cuánto tiempo, y la política de privacidad lo dice.
- Al terminar se cierra la sesión con recarga completa y se muestra una confirmación.
- En modo demostración (`supabase: false`) el botón borra los datos del navegador.
- Cambios de base de datos en un SQL nuevo, con RLS y pruebas en `supabase/sql.test.ts` que comprueben que no queda ninguna fila del círculo ni del usuario.
- Sin datos de salud en logs.

## Decisión del alumno antes de empezar
- Anotaciones de un **miembro** que se va: borrarlas o anonimizarlas. `dose_logs.given_by_name` y `notes.author_name` guardan el nombre como texto y `not null`, así que anonimizar exige reemplazarlo de forma explícita (por ejemplo «Un familiar») en un SQL nuevo.

## Notas
- Uno de los tres compromisos de `COMPROMISOS_LEGALES_CUMPLIDOS` (los otros: baja de correos, hecha en ECU-6, y aviso de renovación, ECU-14).
- La prueba real necesita Supabase en producción (ECU-17).
