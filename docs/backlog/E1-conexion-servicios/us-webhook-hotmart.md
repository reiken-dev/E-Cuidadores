# La app se entera de compras y cancelaciones

**Jira:** pendiente
**Épica:** E1

**Como** dueño del producto, **quiero** que la app reciba los eventos de Hotmart, **para** dar y quitar acceso según el pago real.

## Criterios de aceptación
- El webhook compara el token con `HOTMART_HOTTOK` en tiempo constante.
- Es idempotente: un mismo evento no se procesa dos veces.
- Responde 5xx cuando falla, para que Hotmart reintente.
- Una compra activa el acceso; una cancelación o reembolso lo retira.
- No registra datos de salud ni del comprador en logs.

## Notas
- Punto de partida: `docs/conexion/` (webhook sin activar).
