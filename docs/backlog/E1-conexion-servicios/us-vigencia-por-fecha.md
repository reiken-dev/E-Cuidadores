# Vigencia por fecha de fin y búsqueda por correo

**Jira:** ECU-8
**Épica:** E1

**Como** dueño del producto, **quiero** que el acceso de una suscripción activa o en gracia venza si falta el aviso de baja, y que el webhook encuentre usuarios sin recorrer todas las páginas, **para** no dar acceso permanente por un aviso perdido ni degradarme con el volumen.

## Criterios de aceptación
- `suscripcion_vigente` exige un `current_period_end` vigente, con un margen de gracia definido, para `active` y `past_due`. Una suscripción sin fecha de fin no queda con acceso permanente.
- `trial` conserva su comportamiento actual, o se define su vencimiento por escrito.
- Hay una función SQL que busca un usuario por correo confirmado, accesible solo con la clave de servicio, y el webhook la usa en lugar de recorrer `listUsers`.
- Una cuenta con el correo sin confirmar sigue sin recibir la compra.
- Todo va en una migración nueva en `supabase/`, sin editar `schema.sql` ni `retencion.sql` ya aplicados, y con confirmación del alumno antes de escribir el SQL.
- Pruebas en `supabase/sql.test.ts` (vigencia por estado y fecha, y la búsqueda por correo) y en `app/api/hotmart/route.test.ts`.

## Notas
- Viene de la revisión adversarial de ECU-3 (hallazgos 1 y 6, que necesitan SQL).
- Depende de: webhook de Hotmart (ECU-3).
- El margen de gracia y el vencimiento de `trial` son decisiones del alumno.
