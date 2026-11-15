# Invitar a un hermano con un enlace

**Jira:** ECU-9
**Épica:** E1

**Como** organizador del círculo, **quiero** invitar a mis hermanos con un enlace, **para** que vean y anoten en el mismo círculo sin pagar.

## Criterios de aceptación
- Enlace `/unirme/<código>` con un código que caduca y se puede revocar.
- Quien lo abre crea su cuenta (sin pagar) y entra al círculo; máximo 12 miembros.
- El alta en `members` se hace desde el servidor con la clave de servicio: el navegador no puede.
- El organizador ve quién entró y puede revocar el código.
- El mensaje de invitación no lleva datos de salud.
- La tabla de invitaciones va en una migración nueva, con RLS y pruebas.
- `INVITACION_CONECTADA` pasa a `true` al terminar.

## Notas
- Depende de: datos reales en Supabase (ECU-5).
- Decisión del alumno: el enlace da acceso directo, sin aprobación del organizador.
- Con más de un miembro, la pantalla de confirmar dosis debe dejar de ofrecer «otra persona la dio»: el servidor firma siempre con quien tiene la sesión.
- Cambios de base de datos, en un SQL nuevo y con confirmación.
