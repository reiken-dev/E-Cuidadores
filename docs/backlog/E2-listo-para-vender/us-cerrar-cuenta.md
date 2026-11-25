# Cerrar mi cuenta desde la app

**Jira:** ECU-12
**Épica:** E2

**Como** persona que usa la app (organizador o hermano), **quiero** cerrar mi cuenta desde la app, **para** que mis datos dejen de estar en el servidor sin tener que escribir un correo.

## Criterios de aceptación
- En «Tu suscripción» hay un botón «Cerrar mi cuenta» con un segundo paso de confirmación explícita. Objetivos táctiles de 44 px o más y foco visible.
- Antes de confirmar, la pantalla avisa sin culpa que cerrar la cuenta no cancela el cobro en Hotmart y enlaza al panel de Hotmart (`NEXT_PUBLIC_HOTMART_PANEL_URL`).
- Una ruta de servidor borra al usuario de Supabase Auth con la clave de servicio, solo para quien tiene la sesión.
- Si es organizador: se borran el círculo y todos sus datos (medicinas, dosis, citas, bitácora, invitaciones, suscripciones de avisos); los miembros pierden el acceso.
- Si es miembro: sale del círculo; sus anotaciones se conservan sin su nombre.
- Al terminar se cierra la sesión con recarga completa y se muestra una confirmación.
- En modo demostración (`supabase: false`) el botón borra los datos del navegador.
- Cambios de base de datos en un SQL nuevo, con RLS y pruebas en `supabase/sql.test.ts`. Pruebas de la ruta.
- Sin datos de salud en logs.

## Notas
- Uno de los tres compromisos de `COMPROMISOS_LEGALES_CUMPLIDOS` (los otros: baja de correos, hecha en ECU-6, y aviso de renovación, ECU-14).
- La prueba real necesita Supabase en producción (ECU-17).
- Decisión por confirmar con el alumno en el PR: anonimizar o borrar las anotaciones de un miembro que se va.
