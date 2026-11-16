# Correos reales: Resend y el SMTP propio de Supabase (ECU-4)

Con el servicio de correo integrado de Supabase, solo reciben mensajes los miembros de tu organización y hay un límite bajo por hora: **ninguna otra persona puede crear cuenta**. Esta guía lo resuelve con Resend. Hazla en orden; los pasos con 🔒 los haces tú en tu panel (la clave nunca pasa por el chat ni por git).

> Los nombres de los menús de Resend y Supabase cambian de vez en cuando: `[VERIFICAR: nombre exacto del menú]` si no lo encuentras igual.

## 1. Resend: dominio y clave 🔒
1. En Resend, **Domains → Add domain**. Usa un subdominio (por ejemplo `correo.tu-dominio.com`) para no mezclar tus correos personales.
2. Añade en tu proveedor de DNS los registros que Resend te muestra (SPF y DKIM) y pulsa **Verify**. Espera a que diga *Verified*.
3. **API Keys → Create API Key** con permiso de envío (*Sending access*). Cópiala una sola vez. **Crea dos claves**: una para la app (`RESEND_API_KEY`) y otra solo para el SMTP de Supabase (paso 3). Así, si una se filtra, revocas solo esa. Nunca las pegues en el chat, en git ni en el código.

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
| Password | la **segunda** clave de Resend (pégala directamente en el panel de Supabase, no en el chat) |

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

**Por qué el enlace lleva `token_hash`:** el enlace estándar de Supabase (PKCE) solo funciona en el navegador donde se empezó el registro; quien crea la cuenta en el computador y abre el correo en el celular veía «enlace no válido». Las plantillas de *Confirm sign up* y *Magic link* usan `{{ .RedirectTo }}…&token_hash={{ .TokenHash }}&type=email`, que `/auth/callback` verifica en el servidor y funciona en cualquier navegador. Para que `{{ .RedirectTo }}` sea válido, esa URL debe estar en *Redirect URLs* (paso 5). Si alguien tiene un antivirus de correo que abre los enlaces por su cuenta, el código puede gastarse antes: en ese caso pide un enlace nuevo.

## 5. URLs de la app 🔒
**Authentication → URL Configuration**: *Site URL* = tu dominio público (sin barra final) y, en *Redirect URLs*, `https://tu-dominio.com/auth/callback` y `http://localhost:3000/auth/callback`.

## 6. Pruébalo
1. Con otra dirección que **no** sea la de tu organización de Supabase, crea una cuenta en `/entrar`. Debe llegar el correo de confirmación, en español, desde tu dominio.
2. Pide un enlace de acceso y un cambio de contraseña: deben llegar igual.
3. Con el simulador del webhook, un cobro atrasado y una cancelación a un correo tuyo: `node --env-file=.env.local scripts/simular-hotmart.mjs PURCHASE_DELAYED tu@correo.com PRUEBA-1` (envía un correo real: hazlo solo con tu consentimiento).

## 7. Cuando todo llegue bien
Activa las banderas solo después de comprobar, con una dirección externa a tu organización, que llegan **los correos de acceso de Supabase** (confirmación, enlace de acceso, recuperar contraseña) y **los tres de la app** (bienvenida, cobro fallido, cancelación).
- En `lib/marca.ts`: `conexiones.resend = true` (activa los correos de la app).
- En `lib/oferta.ts`: `CORREOS_CONECTADOS = true` (los textos pasan a decir «te enviamos…»). Los textos legales que hablan de correos también dependen de `COMPROMISOS_LEGALES_CUMPLIDOS` (`lib/legal.ts`).
- `lib/legal.ts` ya nombra a Resend como proveedor: revisa con tu abogado los textos de privacidad.

## Qué envía la app por sí misma (`lib/enviar-correo.ts`)
- **Bienvenida**, al crear tu círculo.
- **Cobro fallido** y **cancelación**, cuando Hotmart avisa por el webhook (una sola vez por aviso).
- Nunca llevan el nombre del familiar, medicinas ni notas. Son correos del servicio: no llevan baja ni se pueden desactivar.
- La bienvenida sale una sola vez por cuenta. El cobro fallido y la cancelación solo se envían a quien ya tiene cuenta y solo con el aviso de baja voluntaria (`SUBSCRIPTION_CANCELLATION`).
- **Límite conocido:** si Resend no responde en ese momento, el correo de cobro o de cancelación **no se reintenta** (el aviso de Hotmart ya quedó guardado y no se reenvía). Revisa el panel de Resend si sospechas que falló. Un reintento fiable pediría una columna nueva en la base (otra historia).
- El resumen semanal, los recordatorios de dosis y los correos de retención **no** salen todavía (ECU-6).
