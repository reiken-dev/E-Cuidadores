# Recibir correos reales (opcional)

**Jira:** ECU-4
**Épica:** E1

**Como** persona que cuida a un familiar, **quiero** recibir correos de acceso y avisos, **para** no depender de abrir la app.

## Criterios de aceptación
- Con Resend conectado, la app envía los correos acordados; sin él, `conexiones.resend` queda en `false`.
- Ningún texto de pantalla promete correos si Resend no está activo.
- `RESEND_API_KEY` nunca lleva `NEXT_PUBLIC_`.
- El contenido de los correos no incluye datos de salud.

## Notas
- Confirmación explícita del alumno antes de enviar cualquier correo real.
- Configurar un SMTP propio en Supabase Auth (Authentication → Emails → SMTP Settings) con dominio verificado. Con el servicio integrado, Supabase solo envía a miembros de la organización y tiene un límite bajo por hora, así que otras personas no pueden crear cuenta. Además, traducir al español las plantillas de correo de Auth (confirmación, enlace de acceso).
