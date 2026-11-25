# Backlog de E-Cuidadores

> Fuente de verdad del backlog. Jira (proyecto `ECU`, `joeducar.atlassian.net`) sirve para seguir quién tiene qué y en qué estado. Si Jira y este repositorio se contradicen, manda el repositorio.

## Estados en Jira
`To Do` → `In Progress` → `In review` → `Done`

## Convenciones
- Una épica por carpeta (`E<n>-<slug>/`) con un `epica.md` y un `us-<slug>.md` por historia.
- Formato de historia: «Como… quiero… para…», criterios de aceptación en lista y notas de alcance.
- Las historias nacen en este repo y después se materializan en Jira, con confirmación del alumno. Anota el ticket en el campo `Jira:` de cada archivo cuando exista.
- Rama de trabajo: `feat/ECU-<n>-<slug>`.

## Épicas
| Épica | Estado | Resumen |
|---|---|---|
| [E1 · Conexión de servicios](./E1-conexion-servicios/epica.md) | Código hecho | Convertir la demostración en un producto real: sesión, cobros, correos y sincronía entre hermanos. |
| [E2 · Listo para vender](./E2-listo-para-vender/epica.md) | En curso | Compromisos legales en código, avisos push de dosis y citas, y puesta en producción de Supabase, Hotmart y Vercel. |

Las tareas de configuración que hace el alumno van en `tarea-<slug>.md` dentro de la carpeta de su épica.
