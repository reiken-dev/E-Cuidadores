# Correos de retención — listos para conectar con Resend

Secuencias completas, en español latino neutro (tuteo), con el tono de la marca: sereno, agradecido, nunca culpable.
Reglas que valen para **todos**:

- **Nunca incluyas nombres de medicinas, diagnósticos ni el texto de las notas.** Un correo puede reenviarse o leerse en otro lado. Usa solo conteos ("12 dosis") y el nombre del familiar o de los hermanos.
- Los correos de **acceso, pago y cancelación** son transaccionales. Los demás (semanal, rescate, win-back) son de marketing: incluye enlace de **desuscribirse** y respeta la elección.
- Máximo **un correo por día** a la misma persona. Si dos secuencias coinciden, gana la de pago.
- Variables: `{{nombre}}` (quien organiza), `{{familiar}}` (a quien cuidan), `{{hermano}}`, `{{enlace_app}}`, `{{enlace_panel_pagos}}`, `{{soporte}}`.
- Verifica tu dominio (SPF, DKIM, DMARC) antes de enviar; Resend te guía en la configuración.

> **Estado (ECU-6):** el cron diario (`app/api/cron/retencion`) ya envía **C. Pagador fantasma** (día 14, una vez por episodio de inactividad) y **B. Ritual semanal** (domingos, solo con actividad, a todos los miembros), ambos con enlace de baja, máximo un correo al día por persona y registro de envíos. Salen **apagados** (`MARKETING_ACTIVO = false` en `lib/oferta.ts`) hasta publicar. En esos dos correos el nombre del familiar no va: solo conteos. Lo demás (A, el día 21 de C, D, F y el dunning por etapas de E) sigue pendiente.

## A. Primera semana (activación)

| Cuándo | Disparador | Asunto | Cuerpo (resumen) |
|---|---|---|---|
| Día 0 | Cuenta creada | `Bienvenida/o, {{nombre}}: ya empezó el cuidado de {{familiar}}` | Una frase de bienvenida, **un solo botón**: "Confirma la próxima dosis". Dile que quedará con su nombre y hora. |
| Día 2 | Sin hermanos en el círculo | `¿Con quién comparten el cuidado de {{familiar}}?` | Explica en 2 líneas que entre más hermanos, menos se pierde. Botón: "Invitar a un hermano" (abre `/app/familia?invitar=1`). |
| Día 3 | Hay dosis confirmadas | `Ya van {{n}} dosis con nombre y hora` | Reconoce el avance (solo el número). Muestra la racha si ≥ 2 días. Botón: "Ver la semana del círculo". |
| Día 7 | Racha de 7 días o primera semana completa | `Una semana con el registro completo` | Celebra con calma (sin exclamaciones múltiples). Sugiere: "Prepara el resumen antes de la próxima cita". |

## B. Ritual semanal (domingo, 6:00 PM hora del familiar)

**Asunto:** `La semana del círculo de {{familiar}}`
**Datos:** `select public.weekly_digest('{{circle_id}}')` (ver `supabase/retencion.sql`).

> Hola {{nombre}},
> Esta semana el círculo de {{familiar}} registró **{{dosis_dadas}} dosis**{{#no_dadas}} y anotó {{dosis_no_dadas}} como no dadas (contarlo también cuenta){{/no_dadas}}.
> {{#por_miembro}}{{nombre}} ayudó con {{dosis}}. {{/por_miembro}}
> [Ver la semana completa] · [Agradecer a tus hermanos]

Solo se envía si hubo actividad. Si no la hubo, **no se envía** (evita el correo vacío).

## C. Pagador fantasma (14 días sin actividad, suscripción activa)

Disparador: cron diario sobre `public.retention_ghost_circles`. **Antes** del próximo cobro, nunca después.

- **Día 14:** `{{familiar}} sigue en tu círculo` — "Retomar es fácil: la próxima dosis te espera." Botón: "Abrir Hoy". Sin culpa, sin "te extrañamos".
- **Día 21 (si no abrió):** `Un resumen de lo que ya tienen guardado` — conteos de valor acumulado y el enlace al resumen para el médico. Pregunta opcional: "¿Hay algo que no te funcionó?" (responder al correo).
- **Día 28:** no se envía nada más. Un tercer correo es spam.

Quien vuelve tras 30+ días entra por "Qué bueno verte de nuevo" (ya está en la app).

## D. Renovación y plan anual

- **Sugerencia del anual** (mensual con 14+ días activos): `Un año de cuidado, con 4 meses gratis` — una sola vez; muestra el valor recibido.
- **Pre-aviso del cobro anual:** 30 y 7 días antes. `Tu plan anual se renueva el {{fecha}}` con el valor del año en conteos y el enlace para administrar. **Se envía aunque cueste ingreso:** es transparencia, y en varios lugares es obligatoria (ver `58`).

## E. Pago fallido (dunning) — recupera el ~⅓ del churn que no es decisión del cliente

Disparador: webhook de Hotmart (`PURCHASE_DELAYED` / cobro rechazado). Marca `subscriptions.status = 'past_due'` (la app ya muestra el aviso de pago pendiente).

| Cuándo | Asunto | Idea |
|---|---|---|
| Inmediato | `No pudimos cobrar tu pago` | Calmado: "Actualiza tu medio de pago en Hotmart para mantener el acceso. Este cobro no borra lo que anotaron". Un botón: actualizar medio de pago (`{{enlace_panel_pagos}}`). |
| Día 3 | `Falta actualizar tu medio de pago` | Recordatorio breve; cuenta cuántos días de acceso conserva. |
| Día 7 | `Último aviso antes de pausar el acceso` | Claro con la fecha; recuerda que **nada se borra** y que se recupera al pagar. |

Para Pix, boleto u OXXO no hay cobro automático: el correo lleva el código nuevo (vence rápido). Ver `58` (rama Pix/boleto).

## F. Cancelación y regreso (win-back)

- **Al cancelar (también si lo hizo desde el panel de Hotmart):** `Gracias por haber cuidado con nosotros` — encuesta de **una** pregunta (mismos motivos que la app) y el recordatorio: "tus datos se conservan {{dias}} días".
- **Día 30 / 60 / 90:** novedades reales del producto + cupón de regreso con fecha (`NEXT_PUBLIC_CUPON_REGRESO`). Quien vuelve pasa por re-onboarding (los resucitados retienen ~20 % peor que un usuario nuevo).
- **Si el motivo fue "ya no cuido a mi familiar":** un solo correo de condolencia y el resumen guardado. **Ninguna** secuencia de regreso.

## G. Plantilla de correo (HTML mínimo)

Mantén el correo simple: un título, dos o tres líneas, un botón, y el pie con el correo de soporte y el enlace de desuscribirse. Usa los colores de `components/landing/tokens.css` (azul `#1F5BD6` para el botón, texto `#0E1B33`).
