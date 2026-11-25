# E2 · Listo para vender

**Jira:** ECU-11
**Estado:** en curso

## Objetivo
El código de E1 está en `main`, pero `npm run verificar -- --estricto` todavía da 13 pendientes (4 graves). Esta épica cierra lo que falta para vender: los compromisos legales en código (cerrar la cuenta, borrar datos y avisar antes de la renovación anual), las notificaciones de dosis y citas, y la puesta en producción de Supabase, Hotmart y Vercel. También la revisión legal.

**Terminado cuando:** `npm run verificar -- --estricto` sale sin pendientes, con `supabase: true` y `hotmart: true` probados de punta a punta.

## Decisiones del alumno (2026-11-25)
- Recordatorios de dosis y citas: notificaciones push reales (Web Push), no solo en la app ni por correo.
- Medición: ninguna por ahora. `enviar()` de `lib/analytics.ts` queda sin proveedor (el gate solo avisa).
- Aviso de renovación anual: 7 días antes.

## Historias (código)
| Archivo | Historia | Depende de |
|---|---|---|
| [us-cerrar-cuenta.md](./us-cerrar-cuenta.md) | Cerrar mi cuenta desde la app (ECU-12) | — |
| [us-borrado-automatico.md](./us-borrado-automatico.md) | Borrado automático de datos tras cancelar (ECU-13) | ECU-12 |
| [us-aviso-renovacion.md](./us-aviso-renovacion.md) | Aviso antes de la renovación anual (ECU-14) | — |
| [us-activar-avisos.md](./us-activar-avisos.md) | Activar avisos en mi teléfono (ECU-15) | — |
| [us-recordatorios.md](./us-recordatorios.md) | Recordatorios de dosis y citas en el teléfono (ECU-16) | ECU-15, ECU-17 |

## Tareas (configuración del alumno, con guía de la IA)
| Archivo | Tarea |
|---|---|
| [tarea-supabase-produccion.md](./tarea-supabase-produccion.md) | Supabase en producción de punta a punta (ECU-17) |
| [tarea-hotmart-produccion.md](./tarea-hotmart-produccion.md) | Hotmart en producción: producto, enlaces y prueba real (ECU-18) |
| [tarea-vercel-produccion.md](./tarea-vercel-produccion.md) | Vercel en producción: dominio y secretos (ECU-19) |
| [tarea-legal.md](./tarea-legal.md) | Datos legales y revisión con abogado (ECU-20) |

## Orden recomendado
ECU-17 → ECU-12 → ECU-13 → ECU-14 → ECU-15 → ECU-16 → ECU-18 → ECU-19 → ECU-20 y `verificar --estricto` en verde.

## Restricciones
- Antes de cada paso que cree cuentas, cobre, envíe correos o despliegue, el alumno confirma de forma explícita.
- No se cambian `supabase/*.sql` ni RLS sin confirmación; un cambio nuevo va en un SQL nuevo.
- Ninguna clave en código, git ni chat. Datos de salud fuera de logs, analítica, URLs y del texto visible de las notificaciones.
