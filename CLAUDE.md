# Instrucciones para la IA del alumno

> Lee primero `PARA-LA-IA-DEL-ALUMNO.md`: ahí están los enlaces, las claves y las banderas. Después sigue `LISTA-DE-CONEXION.md`.

## Qué es esta plantilla
- Una app Next.js 16 que el alumno personaliza y vende: un panel para cuidar a un familiar (medicinas, citas, bitácora y familia).
- Tras `npm install`, y antes de escribir código, lee la guía de Next.js en `node_modules/next/dist/docs/`: cambia respecto a lo que conoces.
- Hoy todo se guarda en el navegador (`lib/store.ts`). No hay cuentas, cobros ni correos reales conectados.
- Obligatorios para vender: Supabase y Hotmart (el gate lo exige). Resend es opcional: si no envía correos, se queda en `false`. GitHub y Vercel sirven para publicar.

## Qué está hecho y qué no
- Hecho: landing, paywall, onboarding, app de demostración, páginas legales (borradores) y el gate `npm run verificar`.
- No hecho: la app no se entera de compras ni cancelaciones (el webhook de Hotmart está en `docs/conexion/` sin activar); no envía correos; no hay sesión real (`sesionDelServidor()` en `lib/sesion.ts` devuelve `null`); no sincroniza entre hermanos; el cron de retención no está activo.
- `/app` ya tiene el guard: con `supabase: true` y sin sesión real, redirige a `/entrar`.
- Sin Supabase conectado, `/app` y `/entrar` son una demostración: no crean cuentas, no envían correos y muestran un banner que lo dice.
- No prometas en pantalla lo que el código no hace: revisa que ningún texto hable de sincronía, correos o cobros que aún no existen.

## Marcadores
- `[COMPLETAR: …]` y `[VERIFICAR: …]` son datos del alumno o pendientes de comprobar. No los inventes ni los rellenes con datos de otro producto. Quítalos solo con el dato o la prueba real.

## Cómo conectar
- Haz los pasos de `LISTA-DE-CONEXION.md` en orden, con el alumno presente. Las piezas listas están en `docs/conexion/README.md`.
- Antes de cada paso que cree cuentas, cobre, envíe correos o despliegue, pide confirmación explícita.

## Secretos
- Nunca escribas claves en el código, en git ni en el chat. No leas ni escribas `.env.local`: los valores los pone el alumno.
- `SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK`, `RESEND_API_KEY` y `CRON_SECRET` nunca llevan `NEXT_PUBLIC_`.

## Base de datos y configuración
- No cambies `supabase/*.sql` ni las reglas RLS sin confirmación explícita. Un cambio nuevo va en un SQL nuevo.
- Los cambios de producto van en la configuración central: `lib/marca.ts` (marca, correo, enlaces y `conexiones`), `lib/oferta.ts` (precios, prueba, garantía) y `lib/legal.ts` (datos legales).
- Cambia lo mínimo: edita en vez de reescribir archivos enteros.

## Verificación antes de dar algo por listo
- Corre `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `npm run test:e2e`.
- Corre `npm run verificar -- --estricto`. Debe salir sin pendientes antes de publicar. No cambies el script para que pase.

## Legal y salud
- Los textos legales son borradores. No cites leyes, autoridades ni cifras nuevas. El alumno debe revisarlos con un abogado de su país.
- Es una app de salud: no diagnostiques, no recetes y no uses la culpa para retener o cobrar.
- Idioma: español neutro, con tuteo y ortografía impecable.

## Recomendaciones técnicas y de calidad

Stack verificado el 2026-10-19 con `npm ci` desde el lockfile:
- Next.js 16.4.2 con Turbopack por defecto (no añadas `--webpack`) y React Compiler activo (`reactCompiler: true` en `next.config.ts`, con `babel-plugin-react-compiler`).
- React 19.3.1, Tailwind CSS 4.3.3 (con `@tailwindcss/postcss`).
- TypeScript 6.0.3. No subas a TypeScript 7 mientras `typescript-eslint` no lo soporte: rompe `npm run lint`.
- ESLint 10.13.0 con configuración plana (`eslint.config.mjs`) y `eslint-config-next` 16.4.2.
- Vitest 5.0.5 para la lógica (`npm test`) y Playwright 1.64.1 con Chromium para el recorrido (`npm run test:e2e`).
- Zod 4.6.7, `@supabase/supabase-js` 2.118 y `@supabase/ssr` 0.12 no están instalados porque la app aún no los usa. Instálalos con `npm install <paquete>@latest` cuando los necesites.
- Node 24 (`.nvmrc`). `engines` exige Node 22.18 o superior.

Verificación, en este orden:
1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build`
6. `npm run test:e2e` (si el puerto 3217 está ocupado: `PUERTO_E2E=3417 npm run test:e2e`)
7. `npm audit --omit=dev` (debe dar 0 vulnerabilidades)
8. `npm run verificar -- --estricto` antes de publicar (es el gate de la app)

Conectar servicios: GitHub y Vercel, Supabase, Hotmart y Resend, en el orden de `LISTA-DE-CONEXION.md`. Las piezas ya escritas están en `docs/conexion/README.md`. Antes de cada paso que cree cuentas, cobre, envíe correos o despliegue, pide confirmación explícita al alumno.

Seguridad:
- Ninguna clave en el cliente: solo los valores públicos llevan `NEXT_PUBLIC_`.
- Ninguna clave en git ni en el chat. `.env.local` lo escribe solo el alumno.
- RLS activo en toda tabla expuesta (`supabase/*.sql`).
- Webhook de Hotmart: compara el token con `HOTMART_HOTTOK` en tiempo constante, es idempotente (un mismo evento no se procesa dos veces) y responde 5xx cuando falla, para que Hotmart reintente.
- Datos de salud (medicinas, citas, bitácora, nombres): no los escribas en logs, analítica ni URLs.

Migraciones:
- No cambies una migración ya aplicada. Los cambios van en una migración nueva.

UX/UI:
- Respeta la identidad visual: tokens de `components/landing/tokens.css`, el Círculo y las fuentes de `app/layout.tsx`.
- Texto de cuerpo de 16 px o más; botones principales de 56 px en móvil; objetivos táctiles de 44 px o más; foco visible; respeta el movimiento reducido (`prefers-reduced-motion`).

Datos y legal:
- No inventes datos del titular (responsable, país, correo, precios). Los marcadores `[COMPLETAR: …]` y `[VERIFICAR: …]` los resuelve el alumno con él.
- Los textos legales son borradores: el alumno debe revisarlos con un abogado de su país.

Si algo falla:
- Lee el error completo y revisa la prueba que falla. No borres pruebas ni las saltes para que pasen, y no apagues reglas de lint sin justificarlo en el código.

## Reglas de proceso (Jira + GitHub)
- Jira: sitio `joeducar.atlassian.net`, proyecto `ECU`, vía el MCP `atlassian` de `.mcp.json`. Estados: `To Do`, `In Progress`, `In review`, `Done`.
- Fuente de verdad: las historias de `docs/backlog/`. Si Jira y el repo se contradicen, manda el repo.
- Antes de crear o editar tickets en Jira, muestra el contenido al alumno y espera su confirmación.
- Antes de tocar código: crea una rama `feat/ECU-<n>-<slug>`. Nunca commitees directo en `main`.
- Para empezar una tarea usa `/priority-ticket`. Al cerrarla, usa `/commit` y luego `gh pr create` con la descripción completa del cambio y `ECU-<n>` en el título.
- Después de abrir el PR, usa el subagente `adversarial-reviewer` antes de darlo por terminado.
- Nunca muevas un ticket a `Done`: lo hace el alumno al fusionar el PR.
- No repitas el resumen del trabajo en el chat: la sesión se pierde, el PR no. Responde con la URL del PR.
