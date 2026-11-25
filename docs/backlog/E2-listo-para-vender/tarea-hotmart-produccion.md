# Hotmart en producción: producto, enlaces y prueba real

**Jira:** ECU-18
**Épica:** E2
**Tipo:** tarea de configuración (la hace el alumno con guía de la IA; sección 3 de `LISTA-DE-CONEXION.md`)

## Pasos
- Crear el producto de suscripción (mensual y anual) con la prueba y la garantía de `lib/oferta.ts`.
- Poner `NEXT_PUBLIC_HOTMART_CHECKOUT_URL`, `NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL` y `NEXT_PUBLIC_HOTMART_PANEL_URL` en Vercel y en `.env.local` (el gate lee `.env.local`). Si hay más de un producto en la cuenta, también `HOTMART_PRODUCT_ID`.
- Configurar el webhook hacia `https://TU-DOMINIO/api/hotmart` con el `HOTMART_HOTTOK`.
- Hacer una compra de prueba real (de cada plan) y una cancelación real.
- Con esos avisos reales, confirmar y quitar los `[VERIFICAR]` de `app/api/hotmart/route.ts`, `lib/hotmart.ts`, `lib/oferta.ts` y `docs/conexion/hotmart-webhook.ts.txt` (cabecera `X-HOTMART-HOTTOK`, fecha de fin, rutas de cancelación, nombres de plan, días de prueba y garantía).

## Terminado cuando
Compra y cancelación reales se reflejan en la app, sin `[VERIFICAR]` de Hotmart, y `hotmart: true` en `lib/marca.ts` (PR aparte).
