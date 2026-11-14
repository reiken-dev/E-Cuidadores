# PARA LA IA DEL ALUMNO — lee esto primero

Esta app es una **PLANTILLA** que el creador del curso entrega a sus alumnos. **El creador no la vende: la vendes tú.**
Por eso trae datos locales y **no tiene ninguna cuenta real conectada** (ni Hotmart, ni Supabase, ni Resend, ni Vercel, ni dominio).
Tu trabajo, con el alumno, es conectar SUS cuentas. Mientras no estén conectadas, la app **avisa con honestidad** en vez de fingir.

> Regla para ti: no inventes enlaces ni claves. Pídele al alumno cada dato de la tabla y colócalo donde dice.
> Al terminar, corre `npm run verificar -- --estricto`: debe salir sin pendientes. Luego `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.

## 1. Dónde van los enlaces y las claves (todo se ve y funciona al ponerlos)

| Qué pedir al alumno | Dónde se pone | Qué cambia en la app |
|---|---|---|
| Enlace de pago **mensual** de Hotmart | `.env.local` → `NEXT_PUBLIC_HOTMART_CHECKOUT_URL` (se lee en `lib/marca.ts`) | El botón de pago del paywall lleva a Hotmart |
| Enlace de pago **anual** de Hotmart | `NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL` | Aparece "Ver el plan anual" en `/app/plan` y en el paywall |
| **Panel de compras** de Hotmart del cliente | `NEXT_PUBLIC_HOTMART_PANEL_URL` | Funcionan "Administrar mi suscripción", "Actualizar el medio de pago" y "Cancelar" en `/app/plan`. **Sin esto abren un aviso "Falta conectar este enlace"** |
| Línea de pagos del pie y del paywall (ej. "Pagos procesados por Hotmart") | `NEXT_PUBLIC_NOTA_PAGO` (o `MARCA.notaPago`) | Se muestra bajo el botón y en el pie; vacía = no aparece nada |
| Cupón de regreso (opcional) | `NEXT_PUBLIC_CUPON_REGRESO` | Se ofrece a quien dice "me resulta caro" al cancelar |
| URL pública del sitio | `NEXT_PUBLIC_SITE_URL` | Enlaces de invitación, correos y metadatos |
| Correo de soporte REAL | `lib/marca.ts` → `soporteEmail` | Pie de página, textos legales y avisos. **Hoy trae `correo@correo.com` como EJEMPLO: DEBES cambiarlo** por un correo tuyo que vayas a usar. El gate no lo bloquea, pero tus clientes lo verán |
| Nombre de la marca | `lib/marca.ts` → `nombre` (y textos de `app/page.tsx`) | Todo el sitio |
| Precio, prueba y garantía | `lib/oferta.ts` (`PRECIO_MES`, `PRECIO_ANIO`, `TRIAL_DIAS`, `GARANTIA_DIAS`) | Landing, paywall, legales. Deben coincidir con lo configurado en Hotmart |
| Supabase (URL y anon key) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; ejecutar `supabase/schema.sql` y luego `supabase/retencion.sql` | Cuentas y datos compartidos |
| `SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK`, `RESEND_API_KEY`, `CRON_SECRET` | `.env.local` y variables de Vercel. **SECRETAS: nunca con `NEXT_PUBLIC_`** | Webhook, correos y cron |

**Precios y prueba (valores sugeridos):**
- Precios sugeridos: confirma tu oferta en Hotmart antes de vender. Cámbialos aquí y en Hotmart para que coincidan. Hoy: US$7.99 al mes y US$79.90 al año (10 mensualidades, dos meses gratis). `PRECIO_ANIO` debe seguir valiendo 10 veces `PRECIO_MES`.
- Prueba sugerida de 7 días: confírmala en Hotmart con estos días, cambia el número o quita la prueba (0) hasta que la tengas configurada. Hoy: 7 días (`TRIAL_DIAS`).
- La garantía es de **7 días** (`GARANTIA_DIAS`), la que da Hotmart. Debe ser el mismo número en el producto de Hotmart.

## 2. Dos banderas que cambian los textos (están en `lib/oferta.ts`)

- `SINCRONIZACION_CONECTADA` (hoy `false`): mientras sea `false`, los textos NO dicen "todos los hermanos lo ven" (en la plantilla los datos viven en un solo dispositivo). Ponla en `true` **solo** cuando lo que anota un hermano ya aparezca en el teléfono de otro (Supabase conectado y probado).
- `DATOS_CONSERVACION_CONFIRMADA` (hoy `false`): mientras sea `false`, no se promete "tus datos se conservan 90 días". Ponla en `true` **solo** si tu servidor de verdad conserva y luego borra a los 90 días (`DIAS_CONSERVAR_DATOS`).

- `CORREOS_CONECTADOS` (hoy `false`, `lib/oferta.ts`): mientras sea `false`, las pantallas no dicen "te enviamos el enlace…". Ponla en `true` al conectar Resend.
- `COMPROMISOS_LEGALES_CUMPLIDOS` (hoy `false`, `lib/legal.ts`): las páginas legales prometen baja de correos (`/baja`), aviso de renovación anual y cierre de cuenta. Ponla en `true` solo cuando existan (ver §7).
- `PRECIOS_DE_EJEMPLO` (hoy `false`, `lib/oferta.ts`): la plantilla ya no marca los precios como de ejemplo. Confírmalos en Hotmart antes de vender. `npm run verificar` falla si la bandera vuelve a `true`.
- `conexiones` (`lib/marca.ts`, hoy todo en `false`): `supabase` y `hotmart` deben estar en `true` antes de vender; `npm run verificar` falla mientras no lo estén. Ponlos en `true` solo cuando funcionen de punta a punta (LISTA-DE-CONEXION.md, sección "Conexiones"). Mientras `supabase` sea `false`, `/app` y `/entrar` son una demostración con banner.
- **Ojo con la landing:** su copy describe el producto ya conectado ("todos los hermanos", "avisos programados"). No publiques ni vendas hasta que `SINCRONIZACION_CONECTADA` y `CORREOS_CONECTADOS` sean realmente `true`.
- **`MARCA.checkoutUrl` ya está conectado al paywall** (`lib/cobro.ts`): con el enlace en `.env.local`, el botón lleva a Hotmart; sin enlace, el botón solo simula (demo, sin cobro). Falta que `/entrar` valide la compra con el webhook: tarea del alumno.

## 3. Textos de plantilla que el cliente final no debe ver (hay que quitarlos o resolverlos al conectar)

`npm run verificar` los lista con archivo y línea. Los principales:
- `app/entrar/EntrarForm.tsx`: "Esta es una demostración local…" → quitar al conectar el acceso real (Supabase Auth).
- `components/app/screens/FamiliaScreen.tsx`: el mensaje para invitar a un hermano **no lleva enlace** mientras `INVITACION_CONECTADA` sea `false` (`lib/oferta.ts`), porque la ruta `/unirme` todavía no existe. Cuando tu servidor genere los enlaces (códigos aleatorios), pon la bandera en `true`.
- `components/app/screens/CitasScreen.tsx` y `lib/schedule.ts`: "El envío real se activa al conectar…" → quitar cuando los avisos se envíen de verdad.
- `components/app/screens/PlanScreen.tsx`: el aviso "Falta conectar este enlace" desaparece solo al poner las URL de la tabla 1.
- El bloque "Probar estados (solo demostración)" de `/app/plan` y el aviso de datos de ejemplo solo salen en modo demo.

## 4. Piezas ya escritas para conectar (NO activas): `docs/conexion/`

Webhook de Hotmart (`hotmart-webhook.ts.txt`), envío con Resend, cron diario y `vercel.json`. La lógica difícil ya está en `lib/hotmart.ts` y `lib/correos.ts`, con pruebas. Pasos y orden en `docs/conexion/README.md` y `LISTA-DE-CONEXION.md`. No actives rutas `app/api/*` sin la verificación del HOTTOK.

## 5. Capa legal (cómo funciona)

Las cinco páginas (`/privacidad`, `/terminos`, `/reembolsos`, `/cookies`, `/aviso-medico`) se arman en `lib/legal-textos.ts` con los datos de `lib/legal.ts`, `lib/oferta.ts` y `lib/marca.ts`. No las reescribas a mano: cambia los datos. `npm test` comprueba que coinciden con la oferta (garantía, prueba, conservación); no lo desactives. Los puntos que debe cerrar el alumno están en la sección 7.

## 6. Lo que NO debes cambiar

La identidad visual (paleta azul, Baloo 2 + Inter, radios), la doctrina de retención sin culpa (`docs/retencion/ESTRATEGIA.md`) y el orden / → /onboarding → /paywall → /entrar → /app.

## 7. Cierre antes de publicar (menciónalo desde el principio)

**Menciónalo desde la primera conversación, no al final.** Tres obligaciones que el alumno debe conocer desde el inicio, porque cambian lo que puede vender: (a) **revisión por un abogado de protección de datos de su país** (la app trata datos de salud); (b) **consentimiento explícito para datos de salud**: la casilla de salud va separada y sin marcar, y se guarda en `consents` al conectar Supabase; (c) **normas de datos personales** que aplican a su país (`lib/legal.ts`, campo `pais`). Luego, cuando el alumno diga que ya terminó de adaptar y configurar la app (marca, textos, precios, enlaces) o pida publicar, conectar el dominio o empezar a vender, hazlo punto por punto: no lo dejes para el final. Llegado el momento, hazlo como una revisión final amable, punto por punto y ayudándolo a resolverlo contigo (rellena tú lo que puedas con sus respuestas). **No des por lista la publicación hasta cerrar los puntos 1 a 6** y haber revisado el 7; corre `npm run verificar -- --estricto` al terminar.

### Titular: MILLION BUSINESS DIGITAL
El titular ya está fijado en `lib/legal.ts`: `responsable` = "MILLION BUSINESS DIGITAL" y `tipoResponsable` = `'empresa'`. Cámbialo solo si el titular real del producto es otro. Domicilio, país e identificador fiscal siguen como `[COMPLETAR]` en `lib/legal.ts`: el gate no deja publicar hasta completarlos.
Si el alumno vendiera como persona natural en vez de con esa razón social, cambia `tipoResponsable` a `'persona_natural'` y `responsable` a su nombre completo, y sigue estos puntos:
- Publica solo nombre, país, ciudad y un correo de contacto; **no pongas su documento de identidad ni su dirección completa** en las páginas públicas (si la ley de su país exige un domicilio para notificaciones, que sea ciudad o un apartado/correo).
- **Responsabilidad personal:** como persona natural responde con su patrimonio personal. Los Términos ya limitan la responsabilidad, pero eso no la elimina. Díselo una vez, en simple, y sugiérele considerar constituir una empresa cuando los ingresos crezcan o por el riesgo de manejar datos de salud (decisión suya, no un bloqueo).
- **Impuestos:** Hotmart le paga a él como productor; ese dinero es **ingreso suyo** y debe declararlo. Las reglas dependen de su país y de su régimen. **No inventes cifras, umbrales ni nombres de trámites:** dile que lo confirme con un contador local, idealmente desde el primer ingreso recurrente.
- **Protección de datos como persona natural:** las leyes de protección de datos también aplican a personas naturales. Si su país exige algún registro ante una autoridad, depende de umbrales: pídele que lo verifique con un abogado, no lo des por hecho. [VERIFICAR: abogado de tu país]

### Garantía: 7 días (la que da Hotmart)
La plantilla trae **7 días** en todas sus versiones. Si el alumno cambia el número, haz esto:
1. `lib/oferta.ts` → `GARANTIA_DIAS` (hoy 7). Landing, paywall y las cinco páginas se actualizan solas (el texto de Reembolsos cambia a "coincide con el derecho de arrepentimiento de 7 días").
2. En el panel de Hotmart, en el producto, configura la garantía con el mismo número. Si no coincide, el incumplimiento será suyo.
3. **Verifica en Hotmart desde qué fecha cuenta la garantía cuando hay prueba gratis.** Con prueba de 7 y garantía de 7, si Hotmart la contara desde el inicio de la prueba, la garantía vencería justo cuando se hace el primer cobro (el cliente no tendría ningún margen). Si es así, quita o acorta la prueba (`TRIAL_DIAS`) y deja `GARANTIA_DIAS` igual a lo configurado en Hotmart. En los textos de la app la garantía cuenta desde el **primer cobro** (no desde el inicio de la prueba) y en suscripciones Hotmart cubre ese primer cobro, no las renovaciones. Nunca debe ser menor de 7.
4. `RENOVACION_REEMBOLSO_DIAS` (por defecto 7, en `lib/oferta.ts`) es una promesa de la plantilla para renovaciones inesperadas: confírmale que él deberá devolverlas (por Hotmart o a mano) y, si no quiere ofrecerlo, bájalo al mínimo que su ley de consumo permita y revisa el texto resultante de Reembolsos.

### Puntos a cerrar (en este orden)
1. **Datos legales:** `lib/legal.ts` (`responsable`, `tipoResponsable`, `pais`, `domicilio`, `emailLegal`) y `soporteEmail` en `lib/marca.ts`. Quita los marcadores `[COMPLETAR]` de `lib/legal.ts` al completar país, domicilio e identificador fiscal. Cambia el correo de ejemplo `correo@correo.com` por el tuyo.
2. **Garantía y reembolsos:** lo de arriba, más verificar en Hotmart cómo reembolsa las renovaciones y el modelo fiscal por país.
3. **Aviso previo a la renovación anual:** los Términos lo prometen. Activa la secuencia D de `docs/retencion/CORREOS.md` (30 y 7 días antes) con `lib/correos.ts` y el cron de `docs/conexion/`. Si vende fuera de su país, [VERIFICAR: abogado de tu país] confirma si aplica alguna regla de renovación automática.
4. **Consentimientos:** al conectar Supabase, guarda cada casilla del registro en `consents` (propósito, `LEGAL.version`, fecha).
5. **Borrar cuenta en el servidor:** un botón que elimine al usuario (`auth.admin.deleteUser`) y arrastre sus datos; hasta entonces el camino es el correo (15 días hábiles). Si lo automatiza, ajusta el texto de Privacidad.
6. **Analítica, píxeles o IA:** si agrega alguno, cambia `analiticaNoEsencial` o `usaIA`, mantén `proveedores` idéntica a lo que usa y revisa las páginas.
7. **Revisión humana (antes de vender):** un abogado de protección de datos de su país revisa los cinco documentos (la app trata **datos de salud**). Un contador local revisa su declaración. **Un profesional de la salud revisa los textos de salud**: el Aviso médico, el resumen para el médico y la forma de presentar la adherencia. Están marcados `[VERIFICAR: revisión de profesional de salud]` en `lib/legal-textos.ts` y `lib/summary.ts`; quita cada marcador cuando lo revisen. La revisión de la plantilla es de completitud profesional: no es asesoría legal ni médica.
8. Cada vez que cambie un texto legal: `LEGAL.actualizado`, `LEGAL.version` y aviso por correo a los usuarios activos si el cambio es importante.
