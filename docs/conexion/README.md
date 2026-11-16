# Piezas listas para conectar (NO activas)

Estos archivos terminan en `.txt` a propósito: así **no se compilan ni se publican** y nadie puede abrir un webhook sin querer.
La lógica difícil ya está en `lib/hotmart.ts` y `lib/correos.ts`, con pruebas. Aquí solo está la parte que toca servicios.

| Archivo | Cópialo a | Requiere |
|---|---|---|
| `hotmart-webhook.ts.txt` (ya copiado a `app/api/hotmart/route.ts`) | `app/api/hotmart/route.ts` | Supabase (`supabase/schema.sql` y `retencion.sql`), `HOTMART_HOTTOK`, `SUPABASE_SERVICE_ROLE_KEY` |
| `resend-correos.ts.txt` | `lib/enviar-correo.ts` (ya implementado, ECU-4; ver `GUIA-SMTP-SUPABASE.md`) | `RESEND_API_KEY`, `EMAIL_FROM`, dominio verificado en Resend |
| `cron-retencion.ts.txt` | `app/api/cron/retencion/route.ts` | `CRON_SECRET`, lo anterior |
| `vercel.json.txt` | `vercel.json` | Vercel |
| `alta-consentimientos.ts.txt` | `lib/alta.ts` | Supabase Auth (al crear la cuenta; guarda las casillas de términos y de salud) |
| `guard-sesion.ts.txt` | sustituye `sesionDelServidor()` en `lib/sesion.ts` | Supabase (`@supabase/ssr`); protege `/app` |

Los archivos marcados `[VERIFICAR]` se confirman con un aviso o una prueba reales antes de publicar: `npm run verificar` lo recuerda.

Orden: 1) Supabase, 2) Hotmart (envía un aviso de prueba), 3) Resend, 4) cron. Después `npm run verificar`.
Nunca pongas `SUPABASE_SERVICE_ROLE_KEY` con prefijo `NEXT_PUBLIC_`.

## Cobro en Hotmart y garantía de 7 días

- El cobro y el reembolso son de Hotmart. La solicitud dentro de los 7 días se gestiona en el área de compras de Hotmart; la política de reembolsos ya lo dice así.
- La garantía de 7 días es `GARANTIA_DIAS` en `lib/oferta.ts`. No la bajes de 7 y confirma el mismo número en el producto de Hotmart.
- Los botones "Cancelar" y "Actualizar el medio de pago" de `/app/plan` abren el panel de compras de Hotmart (`NEXT_PUBLIC_HOTMART_PANEL_URL`). Sin ese enlace muestran un aviso de "falta conectar".

## Píxel de Meta: ViewContent e InitiateCheckout

La plantilla no carga Meta ni ningún otro script. Cada CTA de compra ya trae los atributos para medir:

| Elemento (`id`) | `data-evento` | Qué significa |
|---|---|---|
| `cta-hero`, `cta-anual`, `cta-mensual`, `cta-final` | `inicio-compra` | Inicio de compra: lleva a `/onboarding` |
| `cta-barra-fija` (ya con los planes a la vista) | `inicio-compra` | Igual que arriba |
| `cta-barra-fija` (antes de ver los planes) | `ver-planes` | Solo baja a los planes: no es inicio de compra |

Para conectarlo tú:

1. **Consentimiento primero.** Las cookies de medición no esenciales solo se cargan si la persona acepta. Antes de añadir el píxel, pon `analiticaNoEsencial: true` en `lib/legal.ts` (esto cambia la política de cookies) y dispara el píxel solo cuando `puedeMedir()` sea verdadero (`lib/consentimiento.ts`).
2. **Permitir el dominio.** En `next.config.ts`, abre en `script-src` y `connect-src` solo los dominios de Meta que uses (por ejemplo `connect.facebook.net` y `www.facebook.com`). El resto sigue cerrado.
3. **ViewContent:** dispáralo al cargar la página de ventas (`/`).
4. **InitiateCheckout:** escucha el clic en `document` y dispáralo cuando el elemento que se pulsó (`event.target.closest('[data-evento]')`) tenga `data-evento="inicio-compra"`.
5. **Sin datos personales.** Los eventos llevan solo el nombre del evento y el `id` del CTA. Nunca nombres, medicinas, notas ni correos (ver `lib/analytics.ts`).
