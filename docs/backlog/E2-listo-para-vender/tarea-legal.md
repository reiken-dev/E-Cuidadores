# Datos legales y revisión con abogado

**Jira:** ECU-20
**Épica:** E2
**Tipo:** tarea del alumno. La IA no inventa datos del titular ni cita leyes.

## Pasos
- Completar en `lib/legal.ts` el país desde el que se opera (ley aplicable) y el domicilio para notificaciones. Quitar los `[COMPLETAR]` solo con el dato real.
- Identificador fiscal: la app no tiene campo para él (`lib/legal.ts`). Si el país lo exige, hace falta un cambio de código y de textos (PR aparte).
- Quitar los `[VERIFICAR: revisión de profesional de salud]` solo tras esa revisión.
- Confirmar y quitar los `[VERIFICAR]` de `docs/retencion/ESTRATEGIA.md`.
- La política de privacidad debe mencionar los terceros nuevos: el servicio push del navegador (ECU-15) y qué registros de pago se conservan tras cerrar la cuenta (ECU-12).
- Revisar privacidad, términos, reembolsos, cookies y aviso médico con un abogado del país, después de ECU-12 a ECU-16 (cambian los textos).

## Terminado cuando
Sin `[COMPLETAR]` ni `[VERIFICAR]` en todo lo que lee el gate, y `npm run verificar -- --estricto` sin más avisos que los aceptados en la épica.
