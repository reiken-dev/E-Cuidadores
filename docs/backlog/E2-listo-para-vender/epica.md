# E2 · Listo para vender

**Jira:** ECU-11
**Estado:** en curso

## Objetivo
El código de E1 está en `main`, pero `npm run verificar -- --estricto` todavía da 13 pendientes (4 graves). Esta épica cierra lo que falta para vender: los compromisos legales en código (cerrar la cuenta, borrar datos y avisar antes de la renovación anual), las notificaciones de dosis y citas, y la puesta en producción de Vercel, Supabase y Hotmart. También la revisión legal.

**Terminado cuando:** `npm run verificar -- --estricto` sale sin fallos graves y sin más avisos que los aceptados abajo, con `supabase: true` y `hotmart: true` probados de punta a punta.

### Avisos del gate que esta épica no puede cerrar (decisión pendiente del alumno)
- «Medición sin proveedor»: sale mientras `enviar()` de `lib/analytics.ts` no tenga proveedor, y el alumno decidió no medir por ahora.
- «Datos: siguen guardados en el navegador»: sale mientras `lib/store.ts` mencione `localStorage`, y el modo demostración lo sigue usando aunque `supabase` esté en `true`.
- Con `--estricto` cualquier aviso hace fallar el gate, y no se cambia el script para que pase. El alumno decide: aceptar estos dos avisos de forma explícita (y anotarlo aquí) o abrir una historia que los resuelva de verdad.

## Decisiones del alumno (2026-11-25)
- Recordatorios de dosis y citas: notificaciones push reales (Web Push), no solo en la app ni por correo.
- Medición: ninguna por ahora.
- Aviso de renovación anual: 7 días antes.

## Historias (código)
| Archivo | Historia | Depende de |
|---|---|---|
| [us-cerrar-cuenta.md](./us-cerrar-cuenta.md) | Cerrar mi cuenta desde la app (ECU-12) | ECU-17 (prueba real) |
| [us-borrado-automatico.md](./us-borrado-automatico.md) | Borrado automático de datos tras cancelar (ECU-13) | ECU-12, ECU-18 |
| [us-aviso-renovacion.md](./us-aviso-renovacion.md) | Aviso antes de la renovación anual (ECU-14) | ECU-18 (plan y fecha confirmados) |
| [us-activar-avisos.md](./us-activar-avisos.md) | Activar avisos en mi teléfono (ECU-15) | ECU-17 |
| [us-recordatorios.md](./us-recordatorios.md) | Recordatorios de dosis y citas en el teléfono (ECU-16) | ECU-15, ECU-17, ECU-19 |

## Tareas (configuración del alumno, con guía de la IA)
| Archivo | Tarea | Depende de |
|---|---|---|
| [tarea-vercel-produccion.md](./tarea-vercel-produccion.md) | Vercel en producción: dominio y secretos (ECU-19) | — |
| [tarea-supabase-produccion.md](./tarea-supabase-produccion.md) | Supabase en producción de punta a punta (ECU-17) | ECU-19 (dominio para el callback) |
| [tarea-hotmart-produccion.md](./tarea-hotmart-produccion.md) | Hotmart en producción: producto, enlaces y prueba real (ECU-18) | ECU-17, ECU-19 |
| [tarea-legal.md](./tarea-legal.md) | Datos legales y revisión con abogado (ECU-20) | ECU-12 a ECU-16 |

## Orden recomendado
ECU-19 → ECU-17 → ECU-12 → ECU-18 → ECU-13 → ECU-14 → ECU-15 → ECU-16 → ECU-20 y el gate estricto.

## Restricciones
- Antes de cada paso que cree cuentas, cobre, envíe correos o despliegue, el alumno confirma de forma explícita.
- No se cambian `supabase/*.sql` ni RLS sin confirmación; un cambio nuevo va en un SQL nuevo.
- Ninguna clave en código, git ni chat, tampoco en `supabase/*.sql`. Datos de salud fuera de logs, analítica, URLs y de todo el contenido de las notificaciones.
