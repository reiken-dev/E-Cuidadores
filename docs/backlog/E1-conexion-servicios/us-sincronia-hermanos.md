# Ver los mismos datos que mis hermanos

**Jira:** ECU-5
**Épica:** E1

**Como** hermano o hermana que comparte el cuidado, **quiero** ver las mismas medicinas, citas y bitácora que los demás, **para** coordinarnos sin llamarnos.

## Criterios de aceptación
- Los datos viven en Supabase y no solo en el navegador (`lib/store.ts`).
- Cada familia ve únicamente sus datos, garantizado con RLS.
- Un cambio hecho por una persona aparece para las demás.
- Ningún texto habla de sincronía hasta que esto funcione.

## Notas
- Depende de la sesión real. Define con el alumno el modelo de datos antes de escribir SQL.
