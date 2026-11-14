---
name: commit
description: Genera un commit convencional a partir de los cambios staged. Usar al cerrar una tarea.
---
# Commit convencional

1. Ejecuta `git diff --staged` y resume el cambio. Si no hay nada staged, avisa y no commitees.
2. Redacta un mensaje `tipo(scope): descripción` (feat/fix/refactor/docs/test/chore), en español, en imperativo y sin punto final. Si la rama es `feat/ECU-<n>-…`, añade `ECU-<n>` al final de la descripción.
3. Revisa que el diff no incluya claves, `.env*` ni datos de salud reales. Si los hay, para y avisa.
4. Commitea con ese mensaje. No hagas push.
