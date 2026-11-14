---
name: priority-ticket
description: Trae el ticket de mayor prioridad asignado al usuario en Jira (proyecto ECU, vía MCP) y arranca el trabajo sobre él. Usar al empezar una tarea nueva.
---
# Priority ticket

Sitio Jira: `joeducar.atlassian.net`. Proyecto: `ECU`. Estados: `To Do`, `In Progress`, `In review`, `Done`.

1. Consulta Jira vía MCP con JQL: `project = ECU AND assignee = currentUser() AND status = "To Do" ORDER BY priority DESC, created ASC`. Toma el primero. No consideres tickets en `In Progress`, `In review` o `Done`.
2. Resume sus criterios de aceptación. Si el repo tiene la historia en `docs/backlog/`, léela: si Jira y el repo se contradicen, manda el repo.
3. Entra en plan mode y propone cómo implementarlo, siguiendo `CLAUDE.md`.
4. En cuanto el usuario apruebe el plan: mueve el ticket a `In Progress` y crea la rama `feat/ECU-<n>-<slug>`.
5. Al terminar, con el PR ya abierto según las reglas de `CLAUDE.md`: mueve el ticket a `In review` y comenta en él el enlace al PR.
6. Nunca muevas un ticket a `Done`: eso lo hace el usuario al fusionar.
