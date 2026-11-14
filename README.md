# E-Cuidadores (plantilla)

Plantilla de aplicación web para que hermanos adultos coordinen el cuidado de un familiar mayor: medicinas con confirmación de quién las dio, citas con recordatorios, bitácora compartida y un resumen de una página para el médico. Incluye página de ventas, recorrido de bienvenida, pantalla de planes, acceso y la app interna.

**Importante:** esta plantilla funciona sola, sin servidor. Los datos se guardan solo en el navegador actual. El ejemplo completo es ficticio y nunca debe usarse para una consulta médica. Cuentas, cobros, correos, avisos, sincronización y acceso real son puntos que el comprador conecta con sus propios servicios. La guía paso a paso está en [`MANUAL-DEL-DUENO.md`](./MANUAL-DEL-DUENO.md) y el orden de conexión en [`LISTA-DE-CONEXION.md`](./LISTA-DE-CONEXION.md).

## Cómo abrirla

Necesitas tener instalado [Node.js](https://nodejs.org) (versión 22.18 o superior; el proyecto se prueba con Node 24, ver `.nvmrc`).

```bash
npm install
npm run dev
```

Abre <http://localhost:3000> en tu navegador.

## Cobro, garantía y medición

- **Cobro y reembolso: Hotmart.** Todo se cobra y se reembolsa a través de Hotmart. La solicitud dentro de los 7 días se gestiona con Hotmart (ver `/reembolsos`); la plantilla no tiene otro proceso de reembolso.
- **Garantía de 7 días** sobre el primer cobro. El valor está en `lib/oferta.ts` (`GARANTIA_DIAS = 7`); la landing, el paywall y la política de reembolsos lo leen de ahí. Debe ser el mismo número en el producto de Hotmart y nunca menos de 7.
- **Precios sugeridos: confirma tu oferta en Hotmart antes de vender.** Hoy la plantilla muestra US$7.99 al mes y US$79.90 al año (10 mensualidades, dos meses gratis). Están en `lib/oferta.ts`; cámbialos allí y en Hotmart para que coincidan.
- **Qué se guarda y dónde:** hoy todo lo que anotas se guarda en el navegador de este dispositivo. Ninguna pantalla envía tus datos a un servidor. Un pago pendiente no borra nada: solo cambia el aviso y el acceso se mantiene actualizando el medio de pago en Hotmart.
- **Medición:** la plantilla no carga ningún script de terceros. Cada CTA de compra tiene un `id` estable (`cta-hero`, `cta-anual`, `cta-mensual`, `cta-final`, `cta-barra-fija`) y `data-evento="inicio-compra"`. Para conectar el píxel de Meta con ViewContent e InitiateCheckout, sigue [`docs/conexion/README.md`](./docs/conexion/README.md).

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Página de ventas |
| `/onboarding` | Preguntas de bienvenida y pantalla de planes |
| `/entrar` | Crear cuenta o entrar (simulado) |
| `/app` | Hoy: próxima dosis, citas y novedades |
| `/app/medicinas`, `/app/citas`, `/app/bitacora`, `/app/familia` | Secciones de la app |
| `/app/resumen` | Resumen para el médico |
| `/app/simple` | Modo simple para el adulto mayor |
| `/privacidad`, `/terminos`, `/reembolsos` | Textos legales (revísalos con un abogado) |

## Comandos

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Abre la app en modo de desarrollo |
| `npm run verificar` | Te dice qué falta antes de vender (textos de plantilla, variables de entorno, qué sigue simulado). Con `-- --estricto` falla si queda algo |
| `npm test` | Corre las pruebas automáticas de la lógica (`lib/`) |
| `npm run test:e2e` | Recorre la landing, el paywall y la app en un navegador, a 375 y 1280 px. La primera vez corre `npx playwright install chromium` |
| `npx tsc --noEmit` | Revisa los tipos de TypeScript |
| `npm run lint` | Revisa el estilo del código |
| `npm run build` | Genera la versión para publicar |

## Tecnología

Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion, Lucide y Radix. Pruebas con Vitest.
