# Estrategia de retención — E-Cuidadores

**Objetivo:** que cada círculo familiar use la app todos los días y siga pagando mes tras mes **porque le sirve**, no porque se sienta culpable o atrapado. La plantilla ya trae estas funciones construidas (con datos locales); quien la adapta solo conecta el envío de correos y el cobro.

## 1. Qué dice la evidencia (y de dónde sale)

| Hallazgo | Fuente | Qué hicimos con eso |
|---|---|---|
| Quien suma a un familiar al cuidado se queda más: a los 90 días, los usuarios de Medisafe con un "Medfriend" tenían un **59 % más de probabilidad** de seguir usando la app, y el 71 % mejoró su adherencia. | [Medisafe: impacto de Medfriend](https://medisafe.com/education-resources/the-impact-of-medisafes-medfriend-caregiver-feature-on-adherence) | La retención es un efecto de **red**: la racha es del *círculo*, hay un paso "Invitar a un hermano" en los primeros pasos, un mensaje listo para WhatsApp, y la semana destaca *quién ayudó*. [VERIFICAR: fuente] |
| El 35 % de las cancelaciones de planes anuales ocurre en el **primer mes**, y el 95 % de quienes cancelan un anual no vuelve. | [RevenueCat, State of Subscription Apps 2026](https://www.revenuecat.com/sosa-2026-insights-part-2) · [resumen en 9to5Mac](https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/) | "Tus primeros pasos" (hasta 14 días) y "Tus primeros 30 días": cuatro acciones que construyen el hábito. El valor recibido se muestra antes del primer cobro anual. [VERIFICAR: fuente] |
| Las apps de cuidado que combinan varias funciones y se personalizan retienen más; la comodidad y no causar daño facilitan el uso sostenido. | [Appl Clin Inform 2022](https://www.thieme-connect.de/products/ejournals/html/10.1055/a-1967-8721) · [Caring Village (funciones)](https://www.caringvillage.com/product/features/) | Un solo lugar para dosis + citas + bitácora + resumen; tono calmado; nada que asuste. [VERIFICAR: fuente] |
| El día 7 es la inflexión del hábito; la racha con **comodines** retiene más que la racha rígida. | Duolingo, Lenny's 2024 | Racha del círculo con comodines (1 por cada 7 días, máx. 2) y hito a los 7 días. [VERIFICAR: fuente] |
| El ~⅓ del churn es **involuntario** (cobros fallidos) y se recupera sin convencer a nadie. | Recurly 2026 | Estado "pago pendiente" con aviso calmado y secuencia de correos de recuperación. [VERIFICAR: fuente] |
| Ofrecer una alternativa antes de cancelar rescata entre el 6 % y el 23 %; la pausa se acepta en ~19 % de las sesiones. | Chargebee, Churnkey | Pregunta de un solo paso con respuesta distinta por motivo. **No** hay "pausa" falsa: ver §3. [VERIFICAR: fuente] |

## 2. Lo que la plantilla ya hace (con datos locales)

1. **Ritual diario (Hoy):** la próxima dosis y la próxima cita se entienden de un vistazo; confirmar deja la firma con nombre y hora; atajo `C`.
2. **Registro honesto:** "No se dio" con motivo (no quiso, se pasó la hora, no estaba, el médico la suspendió, otro). Cuenta para la racha y el médico lo ve aparte. Así nadie se ve tentado a confirmar una dosis que no se dio, que sería el peor daño de una racha.
3. **Racha del círculo:** días seguidos con **todo registrado** (dada u omitida). Se ve desde el día 2, con siete puntos en Hoy. Comodines para que un mal día no rompa nada. Cuando se rompe: sin rojo y sin reproche.
4. **La semana del círculo (`/app/semana`):** porcentaje de dosis dadas, los siete días, **quién ayudó** (con botón "Agradecer", que deja una nota en la bitácora), citas atendidas y por venir, hitos. Es el ritual del domingo y la razón para volver.
5. **Hitos con calma** (sin confeti): primera dosis con nombre, ya no cuidan solos, primera cita con todo listo, 7 días, 100 dosis, 30 días, 100 días. Cada uno se celebra una sola vez.
6. **Mientras no estabas:** al abrir Hoy, lo que hicieron los demás, contado con gratitud. Tras 14+ días sin abrir: "Qué bueno verte de nuevo" y la siguiente dosis para retomar (re-onboarding, no reclamo).
7. **Primeros pasos / primeros 30 días:** confirmar la primera dosis, invitar a un hermano, agregar una cita, escribir una novedad.
8. **Invitar a un hermano:** mensaje listo para WhatsApp, menú de compartir del teléfono o copiar.
9. **Tu suscripción (`/app/plan`):** valor del último mes (dosis, días completos, citas, hermanos), sugerencia del plan anual a quien paga mensual y ya vio valor (14+ días), **gestionar o cancelar sin esconderse**, y antes de cancelar una pregunta con ayuda según el motivo. Quien ya no cuida a su familiar recibe un mensaje de acompañamiento, sin intento de retención.
10. **Pago pendiente:** aviso calmado en toda la app ("Actualiza tu medio de pago en Hotmart para mantener el acceso. Este cobro no borra lo que anotaron.") con enlace para actualizar el medio de pago.
11. **Medición:** 20 eventos sin datos personales (`lib/analytics.ts`) para ver el embudo de retención.

## 3. Lo que NO hicimos (y por qué)

- **Una "pausa" de la suscripción que no pausa el cobro.** La facturación la controla Hotmart; un interruptor propio dejaría a la gente pagando creyendo que pausó (reembolsos y reseñas malas). La opción honesta es cancelar con cupón de regreso y datos conservados (`DIAS_CONSERVAR_DATOS`).
- **Culpa, urgencia falsa o "Nos abandonaste".** En una app de salud y de familia es injusto y además contraproducente. La racha nunca se muestra en rojo ni se usa como amenaza.
- **Rankings entre hermanos.** Comparar a quién ayuda más humilla a quien cuida más lejos o con menos tiempo. Se agradece, no se compara.
- **Referidos con premio.** En una app social pequeña (un círculo de 2-4 personas) el crecimiento lo da invitar al hermano, que ya está en el producto.
- **Descuentos de rescate mayores al 40 %.** El 40 % rescata casi igual que el 50 % (`58`). Deja que el cupón sea una decisión de quien vende.
- **Notificaciones push reales.** Requieren servidor; ver `CORREOS.md` para los correos listos para conectar con Resend.

## 4. Lo que deben conectar los alumnos

| Pieza | Qué falta | Dónde |
|---|---|---|
| Correos de la secuencia de retención | Enviarlos con Resend desde un cron/webhook | `docs/retencion/CORREOS.md` |
| Estado del plan (`activo` / `pago_pendiente`) | Que el webhook de Hotmart actualice `subscriptions` y la app lea `plan` | `lib/store.ts` (`setPlan`), `supabase/schema.sql` |
| Enlaces de Hotmart | Panel de compras, checkout anual, cupón de regreso | `lib/marca.ts` y `.env.local` |
| Historial compartido | Que `lastSeenAt`, `hitos` y las dosis omitidas vivan en Supabase | `supabase/retencion.sql` |
| Pagadores fantasma | Un cron diario sobre la vista `retention_ghost_circles` que dispare el correo de rescate | `supabase/retencion.sql` |
| Medición | Conectar un proveedor dentro de `enviar()` | `lib/analytics.ts` |

## 5. Qué medir (y metas de partida)

| Métrica | Cómo | Meta de partida |
|---|---|---|
| Activación D1 | `dosis_confirmada` el día 0 | ≥ 60 % |
| Segundo hermano en 7 días | `invitacion_compartida` + miembros ≥ 2 | ≥ 35 % (el efecto Medfriend) |
| Retorno D7 / D30 | sesiones por círculo | D7 ≥ 7 % ya es top 25 % (Amplitude 2024, en `24`) [VERIFICAR: fuente] |
| Semana vista | `semana_vista` por círculo activo | ≥ 40 % semanal |
| Cancelaciones en el mes 1 del anual | suscripciones | < 35 % de las cancelaciones (RevenueCat 2026) [VERIFICAR: fuente] |
| Recuperación de pagos fallidos | `pago_pendiente_visto` → pago | ≥ 50 % |
| Motivo de cancelación | `cancelacion_motivo` | para decidir qué construir |

> Ética de la medición: ningún evento lleva nombres, medicinas ni notas. El tipo `Propiedades` lo impide a propósito.
