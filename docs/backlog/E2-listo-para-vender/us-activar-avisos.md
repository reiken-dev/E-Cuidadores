# Activar avisos en mi teléfono

**Jira:** ECU-15
**Épica:** E2

**Como** hermano que cuida a un familiar, **quiero** activar avisos en mi teléfono, **para** recibir los recordatorios aunque no tenga la app abierta.

## Criterios de aceptación
- Service worker y Web Push con claves VAPID: la pública en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y la privada en `VAPID_PRIVATE_KEY` (nunca con `NEXT_PUBLIC_`).
- Botón «Activar avisos en este teléfono». El permiso del navegador se pide solo después de ese toque, nunca al cargar.
- Las suscripciones se guardan por usuario y dispositivo en una tabla nueva (SQL nuevo, RLS: cada persona ve solo las suyas). Se pueden desactivar desde la app; las caducadas (404/410) se borran solas.
- En iPhone solo funciona con la app añadida a la pantalla de inicio (iOS 16.4 o superior): la pantalla lo explica con pasos.
- Botón «Enviar un aviso de prueba».
- En modo demostración (`supabase: false`) no se ofrece.
- El texto de plantilla que ve el cliente en `components/app/screens/CitasScreen.tsx:201` («El envío real se activa al conectar tu servicio») se cambia por uno honesto. Mientras ECU-16 no esté, ningún texto promete recordatorios.
- CSP actualizada si hace falta. Pruebas de la ruta de suscripción y del SQL.

## Notas
- Decisión del alumno: notificaciones push reales (opción C).
- Parte 1 de los recordatorios; la parte 2 es ECU-16.
