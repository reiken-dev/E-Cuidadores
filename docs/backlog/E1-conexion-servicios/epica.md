# E1 · Conexión de servicios

**Jira:** ECU-1
**Estado:** borrador, por validar con el alumno

## Objetivo
Hoy la app es una demostración que guarda todo en el navegador (`lib/store.ts`). Esta épica conecta los servicios reales para poder venderla, sin prometer en pantalla nada que el código no haga.

## Origen
Sale de la sección «No hecho» de `CLAUDE.md` y de `LISTA-DE-CONEXION.md`. Las piezas ya escritas están en `docs/conexion/README.md`.

## Historias
| Archivo | Historia | Depende de |
|---|---|---|
| [us-sesion-real.md](./us-sesion-real.md) | Entrar con una cuenta real | — |
| [us-webhook-hotmart.md](./us-webhook-hotmart.md) | La app se entera de compras y cancelaciones | sesión real |
| [us-correos.md](./us-correos.md) | Recibir correos reales (opcional) | sesión real |
| [us-sincronia-hermanos.md](./us-sincronia-hermanos.md) | Ver los mismos datos que mis hermanos | sesión real |
| [us-cron-retencion.md](./us-cron-retencion.md) | Retención activa sin culpa | webhook Hotmart |
| [us-vigencia-por-fecha.md](./us-vigencia-por-fecha.md) | Vigencia por fecha de fin y búsqueda por correo | webhook Hotmart |

## Restricciones
- Antes de cada paso que cree cuentas, cobre, envíe correos o despliegue, el alumno confirma de forma explícita.
- No se cambian `supabase/*.sql` ni RLS sin confirmación; un cambio nuevo va en un SQL nuevo.
- Ninguna clave en código, git ni chat. Datos de salud fuera de logs, analítica y URLs.
