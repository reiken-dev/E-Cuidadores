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
- [ ] Después ejecuta también `supabase/permisos-service-role.sql`, sobre todo si al crear el proyecto desmarcaste «Automatically expose new tables»: sin él, el webhook y el cron fallan con «permission denied for table» aunque la clave de servicio sea correcta. Es inofensivo si dejaste esa opción marcada.
- [ ] Autenticación: `app/entrar/EntrarForm.tsx` (hash, límite de intentos, confirmar correo). Con `supabase: true` el formulario ya no simula: hasta que lo conectes, muestra que no está conectado.
- [ ] Alta con consentimientos: al crear la cuenta, guarda las dos casillas con `docs/conexion/alta-consentimientos.ts.txt`. Sin ese registro no publiques.
- [ ] Protege `/app` con sesión: copia la lectura de sesión de `docs/conexion/guard-sesion.ts.txt` en `lib/sesion.ts` (el marcador `[COMPLETAR]` de ese archivo debe desaparecer). Sin sesión, `/app` redirige a `/entrar`.
- [ ] Auth en el panel de Supabase (código listo en `lib/sesion.ts`, `proxy.ts`, `app/auth/callback` y `app/aceptar`):
  - En Authentication → URL Configuration, añade `https://TU-DOMINIO/auth/callback` (y el de previsualización de Vercel si lo usas).
  - Pon `NEXT_PUBLIC_SITE_URL` con tu dominio público: el callback redirige a él.
  - Confirma si quieres "Confirm email" activo; el flujo funciona con o sin él.
  - Rate limits: el límite de intentos del formulario es solo visual. La protección real es la de Supabase Auth (Authentication → Rate Limits): revísala. El proveedor de correo integrado de Supabase tiene un tope muy bajo: para producción configura un SMTP propio.
  - Quien tenga sesión pero no los dos consentimientos guardados pasa por `/aceptar` antes de entrar a `/app`.
- [ ] Datos: ejecuta `supabase/datos-reales.sql` (después de `schema.sql`, `retencion.sql` y `permisos-service-role.sql`). Con `supabase: true` en `lib/marca.ts`, `lib/store.ts` guarda en Supabase (adaptador en `lib/datos/`; el contrato está en `docs/conexion/ADAPTADOR-DATOS.md`). El círculo se crea en `/bienvenida` y exige una suscripción vigente: con Hotmart real, la compra; para probar, el simulador (`scripts/simular-hotmart.mjs`).
- [x] Hermanos: la invitación por enlace (ECU-9) funciona: ejecuta `supabase/invitaciones.sql` después de `datos-reales.sql`. Que vean los cambios de los demás (ECU-10) también funciona: la app se actualiza sola al volver y cada 30 s (`SINCRONIZACION_CONECTADA = true`; con Supabase desconectado los textos siguen sin prometerla).
- [ ] Textos legales: con `supabase: true` los borradores de `lib/legal-textos.ts` cambian solos y hablan de servidor y de proveedores. Completa `LEGAL` y revísalos con tu abogado antes de publicar. Repasa las frases sobre «las personas que tú invitas»: ahora entran con un enlace que da acceso directo y que el organizador puede revocar. Los textos de la app sobre dónde se guardan los datos ya cambian con ese flag (`datosTexto` en `lib/oferta.ts`).
- [ ] Pruebas con el flag activo: `npm test` pasa con `supabase` en `true` o en `false`. Los e2e (`npm run test:e2e`) recorren la demostración, así que corren con `supabase: false`.
- [ ] Prueba con DOS cuentas distintas: una no debe ver los datos de la otra (RLS). `npm test` ya prueba esto en un PostgreSQL en memoria (`supabase/sql.test.ts`); tu proyecto real hay que probarlo aparte.

## 3. Hotmart (cobros)
- [ ] Crea el producto de **suscripción** (la prueba gratis exige Hotmart Club y tarjeta).
- [ ] Pon tu enlace en `NEXT_PUBLIC_HOTMART_CHECKOUT_URL` (y el anual en `NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL`) en `.env.local` y vuelve a publicar. El botón del paywall ya lleva a Hotmart: no hace falta tocar su código (la decisión está en `lib/cobro.ts`).
- [ ] Webhook: ya está en `app/api/hotmart/route.ts`, con pruebas. Es idempotente; responde 200 solo tras guardar, 5xx si falla (Hotmart reintenta) y 503 si falta la configuración. Falta ponerlo a funcionar con tus claves: `HOTMART_HOTTOK`, `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; nunca con `NEXT_PUBLIC_`). Si vendes más de un producto en la misma cuenta de Hotmart, define también `HOTMART_PRODUCT_ID` para que los avisos de los demás se ignoren. Para probarlo sin Hotmart: `npm run dev` y, en otra terminal, `node --env-file=.env.local scripts/simular-hotmart.mjs PURCHASE_APPROVED tu@correo.com PRUEBA-1`.
- [x] Vigencia por fecha (ECU-8): ejecuta `supabase/vigencia-y-correo.sql` **después** de `invitaciones-ajustes.sql`. Una suscripción activa o con cobro fallido vence a los 7 días de su fecha de fin (con fecha de respaldo por plan si Hotmart no la manda) y el webhook busca al comprador con una sola consulta (`usuario_por_correo`). **Orden al publicar: primero el SQL y después el código.** Mientras el SQL no esté aplicado, el webhook responde 5xx (Hotmart reintenta, pero un número limitado de veces). Antes de ejecutarlo en un proyecto con clientes reales, mira a quién afectaría: `select user_id, status, plan, current_period_end, updated_at from public.subscriptions where status in ('active','past_due') and current_period_end is null and updated_at < now() - interval '38 days';` — esas filas pasan a no vigentes al instante (las de plan anual, si pasaron 373 días). Una renovación sin fecha borra la fecha anterior y usa la de respaldo. Límite conocido: con la fecha de respaldo, cada aviso aplicado (incluso un cobro atrasado repetido) renueva 31 días; es un acceso acotado, no permanente.
- [ ] Confirma con un aviso de prueba de Hotmart los campos marcados `[VERIFICAR]` (cabecera `X-HOTMART-HOTTOK`, fecha de fin de periodo y nombres de plan). Si un plan no se reconoce, queda como `desconocido`: revísalo a mano.
- [ ] Haz una compra de prueba real y una cancelación real. Si la persona aún no tiene cuenta, su compra queda pendiente y se enlaza al confirmar su correo.

## 4. Resend (correos)
- [ ] Sigue `docs/conexion/GUIA-SMTP-SUPABASE.md`: verifica tu dominio en Resend, crea `RESEND_API_KEY` y `EMAIL_FROM` (sin `NEXT_PUBLIC_`), configura el SMTP propio en Supabase y pega las plantillas de `supabase/plantillas-correo/`. Sin SMTP propio, solo los miembros de tu organización reciben el correo de acceso.
- [x] Correos mínimos del código (ECU-4): bienvenida, cobro fallido y cancelación (`lib/enviar-correo.ts`; apagados mientras `conexiones.resend = false`). El acceso y la confirmación los envía Supabase por tu SMTP. La invitación a hermanos es el enlace que compartes tú.
- [x] Banderas activadas (ECU-4): `conexiones.resend = true` y `CORREOS_CONECTADOS = true`. Probados con envíos reales: confirmación de cuenta, cobro fallido y cancelación. Sin probar aún: bienvenida, enlace de acceso y cambio de correo. Si Resend falla en el momento del aviso de Hotmart, ese correo no se reintenta. Los recordatorios de dosis y citas no se envían (ECU-6).
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
