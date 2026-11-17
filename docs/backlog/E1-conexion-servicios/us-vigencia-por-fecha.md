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

## Resultado (ECU-8)
- `supabase/vigencia-y-correo.sql`: `active` y `past_due` vencen a los **7 días** de `current_period_end`; sin fecha se usa la de respaldo por plan (mensual y desconocido 31 días, anual 366 días desde la última actualización) más la gracia. `trial` queda como estaba (vigente sin fecha; hoy ningún aviso lo asigna: su vencimiento se define cuando se confirme la prueba gratis con Hotmart). `canceled` no cambia (sin gracia).
- `usuario_por_correo(p_email)`: solo correos confirmados y solo para `service_role`; el webhook la usa en lugar de recorrer `listUsers`.
- `planDeSuscripcion` (`lib/datos/mapeo.ts`) aplica la misma regla, para que la pantalla y la base coincidan.
- Una compra o renovación (`active`) sin fecha de fin borra la fecha anterior, para que una fecha vieja no deje sin acceso a quien acaba de pagar. Un aviso sin fecha en otros estados no toca lo guardado.
- Límite conocido: con la fecha de respaldo, cada aviso aplicado renueva 31 días de acceso (acotado, no permanente).
- Pendiente fuera de esta historia: confirmar `date_next_charge` con un aviso real de Hotmart (`[VERIFICAR]`).

## Notas
- Viene de la revisión adversarial de ECU-3 (hallazgos 1 y 6, que necesitan SQL).
- Depende de: webhook de Hotmart (ECU-3).
- El margen de gracia y el vencimiento de `trial` son decisiones del alumno.
