# Lista de conexión — de plantilla a negocio

Para quien recibe esta plantilla. Hazlo **en este orden**; después de cada paso corre `npm run verificar` y mira cuántas casillas quedan.
El detalle de cada paso (con las instrucciones listas para pegarle a tu IA) está en `MANUAL-DEL-DUENO.md`.

## 0. Antes de tocar nada
- [ ] `npm install`, `npm run dev` y recorre: página de ventas → recorrido → planes → entrar → app.
- [ ] Cambia la marca: `lib/marca.ts` (nombre, correo de soporte) y los textos de `app/page.tsx`.
- [ ] Define tu oferta: `lib/oferta.ts` (precios, prueba, garantía). **Debe coincidir** con Hotmart y con los textos legales.
- [ ] Paleta y tipografías: `components/landing/tokens.css` y `app/layout.tsx` (MANUAL sección 4).
- [ ] Testimonios (si ya tienes): solo reales y con permiso, en `lib/prueba-social.ts`. Sin datos, la sección no aparece en la landing.

### Conexiones: qué marcar y cuándo (`lib/marca.ts` → `conexiones`)
- `supabase: true` cuando la base, el acceso con sesión (`lib/sesion.ts`), el alta con consentimientos y la sincronización entre hermanos funcionen de punta a punta. Mientras sea `false`, la app es una demostración con banner.
- `hotmart: true` cuando el webhook y el enlace de compra funcionen con una compra y una cancelación de prueba reales.
- `resend: true` solo si envías correos reales. Si no los usas, déjalo en `false`.
- `npm run verificar` **falla** mientras `supabase` o `hotmart` sigan en `false` (la app vende y tiene acceso protegido), y mientras queden marcadores `[COMPLETAR]` o `[VERIFICAR]`.

## 1. GitHub y Vercel (publicar vacío)
- [ ] Sube el proyecto a tu GitHub (`.env.local` **nunca** se sube: ya está ignorado).
- [ ] Impórtalo en Vercel y pon `NEXT_PUBLIC_SITE_URL` con tu dominio.
- [ ] Conecta tu dominio.

## 2. Supabase (cuentas y datos)
- [ ] Instala el cliente de Supabase: `npm install @supabase/supabase-js` (lo usan el webhook y el cron de `docs/conexion/`).
- [ ] Crea el proyecto y ejecuta `supabase/schema.sql` y después `supabase/retencion.sql` en el editor SQL. Si cambias un archivo SQL, vuelve a ejecutarlo en un proyecto vacío primero.
- [ ] Autenticación: `app/entrar/EntrarForm.tsx` (hash, límite de intentos, confirmar correo). Con `supabase: true` el formulario ya no simula: hasta que lo conectes, muestra que no está conectado.
- [ ] Alta con consentimientos: al crear la cuenta, guarda las dos casillas con `docs/conexion/alta-consentimientos.ts.txt`. Sin ese registro no publiques.
- [ ] Protege `/app` con sesión: copia la lectura de sesión de `docs/conexion/guard-sesion.ts.txt` en `lib/sesion.ts` (el marcador `[COMPLETAR]` de ese archivo debe desaparecer). Sin sesión, `/app` redirige a `/entrar`.
- [ ] Datos: reemplaza `lib/store.ts` por llamadas a Supabase (es la única frontera con los datos). El contrato que debe cumplir está en `docs/conexion/ADAPTADOR-DATOS.md`.
- [ ] Prueba con DOS cuentas distintas: una no debe ver los datos de la otra (RLS). `npm test` ya prueba esto en un PostgreSQL en memoria (`supabase/sql.test.ts`); tu proyecto real hay que probarlo aparte.

## 3. Hotmart (cobros)
- [ ] Crea el producto de **suscripción** (la prueba gratis exige Hotmart Club y tarjeta).
- [ ] Pon tu enlace en `NEXT_PUBLIC_HOTMART_CHECKOUT_URL` (y el anual en `NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL`) en `.env.local` y vuelve a publicar. El botón del paywall ya lleva a Hotmart: no hace falta tocar su código (la decisión está en `lib/cobro.ts`).
- [ ] Webhook: copia `docs/conexion/hotmart-webhook.ts.txt` a `app/api/hotmart/route.ts` con `HOTMART_HOTTOK`, `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Idempotente; responde 200 solo tras guardar, 5xx si falla (Hotmart reintenta) y 503 si falta la configuración.
- [ ] Confirma con un aviso de prueba de Hotmart los campos marcados `[VERIFICAR]` (cabecera `X-HOTMART-HOTTOK`, fecha de fin de periodo y nombres de plan). Si un plan no se reconoce, queda como `desconocido`: revísalo a mano.
- [ ] Haz una compra de prueba real y una cancelación real. Si la persona aún no tiene cuenta, su compra queda pendiente y se enlaza al confirmar su correo.

## 4. Resend (correos)
- [ ] Verifica tu dominio y crea `RESEND_API_KEY` y `EMAIL_FROM`.
- [ ] Correos mínimos: acceso/confirmación, bienvenida, aviso de cobro, invitación a hermanos.
- [ ] Recordatorios de dosis y citas (hoy son solo "programados": no llegan).

## 4b. Retención (ya viene construida: conecta el envío y el cobro)
- [ ] Lee `docs/retencion/ESTRATEGIA.md` (qué hace la app para que la usen todos los días y sigan pagando, y qué no se hizo y por qué).
- [ ] Ejecuta `supabase/retencion.sql` (dosis omitidas, última visita, pagadores fantasma, datos del correo semanal). Pruébalo primero en un proyecto vacío.
- [ ] Pon en `.env.local`: `NEXT_PUBLIC_HOTMART_PANEL_URL`, `NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL` y, si ofreces uno, `NEXT_PUBLIC_CUPON_REGRESO`. La pantalla **Tu suscripción** los usa.
- [ ] Que el webhook de Hotmart actualice `subscriptions.status` (`active` / `past_due` / `canceled`) y la app lea ese estado (hoy es local: `actions.setPlan`).
- [ ] Pon `CRON_SECRET` en Vercel y copia `docs/conexion/vercel.json.txt` a `vercel.json`. El cron no envía marketing mientras `MARKETING_ACTIVO` sea `false` (`app/api/cron/retencion/route.ts`): no lo cambies hasta tener bajas funcionales.
- [ ] Envía las secuencias de `docs/retencion/CORREOS.md` con Resend: primera semana, resumen semanal, pagador fantasma, pago fallido, renovación anual y regreso.
- [ ] Confirma que `DIAS_CONSERVAR_DATOS` (`lib/oferta.ts`) coincide con lo que de verdad hace tu servidor al cancelar.
- [ ] **No agregues una "pausa" que no pause el cobro en Hotmart:** deja pagando a la gente creyendo que pausó.

## 5. Medición
- [ ] Conecta tu proveedor en `lib/analytics.ts` (`enviar()`). Los eventos ya están puestos en el embudo.
- [ ] Nunca envíes nombres, medicinas ni notas: solo los eventos que ya existen.

## 6. Textos legales y claims
- [ ] Revisa privacidad, términos y reembolsos con un abogado de tu país.
- [ ] Quita los avisos de plantilla (`npm run verificar` te los lista) y no prometas nada que tu sistema no haga.

## 7. Antes de vender
- [ ] `npm run verificar -- --estricto` sin pendientes y sin fallos (incluido el gate de conexión).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` limpios.
- [ ] `npm run test:e2e` pasa: recorre la landing, el paywall y la app en 375 y 1280 px (la primera vez corre `npx playwright install chromium`).
- [ ] Lighthouse móvil y revisión en un teléfono real.
- [ ] Datos de ejemplo apagados para clientes reales (modo demostración solo en tu cuenta demo).


## Piezas ya escritas para conectar (retención)
Ver `docs/conexion/README.md`: webhook de Hotmart, envío con Resend y cron diario, con la lógica probada en `lib/hotmart.ts` y `lib/correos.ts`. Al confirmar que tu servidor conserva los datos, pon `DATOS_CONSERVACION_CONFIRMADA = true` en `lib/oferta.ts`.
