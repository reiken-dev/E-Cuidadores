# Datos legales y revisión con abogado

**Jira:** ECU-20
**Épica:** E2
**Tipo:** tarea del alumno. La IA no inventa datos del titular ni cita leyes.

## Pasos
- Completar en `lib/legal.ts`: país desde el que se opera (ley aplicable), domicilio para notificaciones e identificador fiscal si el país lo exige. Quitar los `[COMPLETAR]` solo con el dato real.
- Quitar los `[VERIFICAR: revisión de profesional de salud]` solo tras esa revisión.
- Revisar privacidad, términos, reembolsos, cookies y aviso médico con un abogado del país, después de ECU-12, ECU-13 y ECU-14 (cambian los textos).

## Terminado cuando
Sin `[COMPLETAR]` ni `[VERIFICAR]` y `npm run verificar -- --estricto` sale sin pendientes.
