# Correos reales: Resend y el SMTP propio de Supabase (ECU-4)

Con el servicio de correo integrado de Supabase, solo reciben mensajes los miembros de tu organización y hay un límite bajo por hora: **ninguna otra persona puede crear cuenta**. Esta guía lo resuelve con Resend. Hazla en orden; los pasos con 🔒 los haces tú en tu panel (la clave nunca pasa por el chat ni por git).

> Los nombres de los menús de Resend y Supabase cambian de vez en cuando: `[VERIFICAR: nombre exacto del menú]` si no lo encuentras igual.

## 1. Resend: dominio y clave 🔒
1. En Resend, **Domains → Add domain**. Usa un subdominio (por ejemplo `correo.tu-dominio.com`) para no mezclar tus correos personales.
2. Añade en tu proveedor de DNS los registros que Resend te muestra (SPF y DKIM) y pulsa **Verify**. Espera a que diga *Verified*.
3. **API Keys → Create API Key** con permiso de envío (*Sending access*). Cópiala una sola vez.

## 2. Variables de entorno 🔒
En `.env.local` (y después en Vercel → Settings → Environment Variables), **sin** `NEXT_PUBLIC_`:
```
RESEND_API_KEY=…           # la clave del paso 1
EMAIL_FROM="E-Cuidadores <hola@correo.tu-dominio.com>"   # el dominio verificado
```
Sin `EMAIL_FROM` la app no envía nada: no hay remitente por defecto.

## 3. SMTP propio en Supabase 🔒
**Authentication → Emails → SMTP Settings → Enable custom SMTP** `[VERIFICAR: ruta]`:
| Campo | Valor |
|---|---|
| Sender email | el mismo correo de `EMAIL_FROM` |
| Sender name | tu marca |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | tu `RESEND_API_KEY` (pégala directamente en el panel) |

Después revisa **Authentication → Rate Limits** `[VERIFICAR]`: con SMTP propio, sube el máximo de correos por hora a lo que necesites.

## 4. Plantillas en español 🔒
En **Authentication → Emails → Templates** pega el contenido de cada archivo de `supabase/plantillas-correo/` y el asunto sugerido (cambia «E-Cuidadores» por tu marca):

| Plantilla de Supabase | Archivo | Asunto sugerido |
|---|---|---|
| Confirm sign up | `confirmacion.html` | Confirma tu correo en E-Cuidadores |
| Magic Link | `enlace-acceso.html` | Tu enlace para entrar a E-Cuidadores |
| Reset Password | `recuperar-contrasena.html` | Cambia tu contraseña de E-Cuidadores |
| Change Email Address | `cambio-de-correo.html` | Confirma tu nuevo correo en E-Cuidadores |

Los correos de acceso no llevan datos de salud: solo el enlace.

## 5. URLs de la app 🔒
**Authentication → URL Configuration**: *Site URL* = tu dominio público (sin barra final) y, en *Redirect URLs*, `https://tu-dominio.com/auth/callback` y `http://localhost:3000/auth/callback`.

## 6. Pruébalo
1. Con otra dirección que **no** sea la de tu organización de Supabase, crea una cuenta en `/entrar`. Debe llegar el correo de confirmación, en español, desde tu dominio.
2. Pide un enlace de acceso y un cambio de contraseña: deben llegar igual.
3. Con el simulador del webhook, un cobro atrasado y una cancelación a un correo tuyo: `node --env-file=.env.local scripts/simular-hotmart.mjs PURCHASE_DELAYED tu@correo.com PRUEBA-1` (envía un correo real: hazlo solo con tu consentimiento).

## 7. Cuando todo llegue bien
- En `lib/marca.ts`: `conexiones.resend = true`.
- En `lib/oferta.ts`: `CORREOS_CONECTADOS = true` (los textos pasan a decir «te enviamos…»).
- `lib/legal.ts` ya nombra a Resend como proveedor: revisa con tu abogado los textos de privacidad.

## Qué envía la app por sí misma (`lib/enviar-correo.ts`)
- **Bienvenida**, al crear tu círculo.
- **Cobro fallido** y **cancelación**, cuando Hotmart avisa por el webhook (una sola vez por aviso).
- Nunca llevan el nombre del familiar, medicinas ni notas. Son correos del servicio: no llevan baja ni se pueden desactivar.
- El resumen semanal, los recordatorios de dosis y los correos de retención **no** salen todavía (ECU-6).
