---
name: implement-plan
description: Implementa un plan de docs/plans/ (generado por plan-feature) en un git worktree aislado, tarea a tarea con TDD estricto, haciendo un commit y marcando la tarea como hecha en el plan tras cada una, hasta cumplir los criterios de aceptación. Úsala cuando el usuario pida implementar, ejecutar o llevar a cabo un plan.
argument-hint: [número de la issue de GitHub a implementar]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion, mcp__slack__slack_list_channels, mcp__slack__slack_post_message
---

Implementa el plan indicado siguiendo los pasos de abajo, en orden y sin saltarte ninguno.

La tarea a implementar vive en una issue de GitHub; el usuario te indica su número. Número de issue a implementar: $ARGUMENTS

## Pasos

### 1. Localizar la issue y leer el plan

- El número de la issue viene en `$ARGUMENTS`. Si falta o no es un número válido, pídeselo al usuario con `AskUserQuestion`; no lo adivines.
- Busca la issue en GitHub con `gh issue view <número> --json number,title,body,labels,comments`. Si `gh` falla o la issue no existe, informa al usuario y detente.
- El plan de esa issue es el que `plan-feature` guardó en `docs/plans/` y publicó como comentario de la issue. Localiza el archivo de `docs/plans/` que corresponda (por el título/slug de la issue o por el contenido del comentario del plan). Si no existe en el repo pero sí como comentario de la issue, escribe ese contenido en `docs/plans/<slug>.md`. Si hay varios candidatos o ninguno, pregunta con `AskUserQuestion`.
- Lee el plan completo (objetivo, tareas, criterios de aceptación) y `CLAUDE.md` (convenciones y arquitectura por capas).
- Las tareas ya marcadas `- [x]` se saltan: permite reanudar un plan a medias.
- Si el plan es ambiguo o contradice el código real, pregunta antes de empezar; no inventes.

### 2. Crear el git worktree

- Rama y carpeta derivadas del nombre del plan: rama `plan/<slug>`, carpeta `../resttek-worktrees/<slug>` (fuera del repo, así no ensucia el árbol principal).
- Crea con `git worktree add -b plan/<slug> ../resttek-worktrees/<slug>`. Si la rama o el worktree ya existen (reanudación), reutilízalos en lugar de recrearlos.
- **A partir de aquí todo el trabajo (editar, tests, commits) ocurre dentro del worktree**, usando rutas absolutas o `git -C <worktree>`. No toques el árbol principal.
- Si el plan no está versionado en `HEAD` (p. ej. `docs/plans/` sin commitear), cópialo al mismo path dentro del worktree y haz un primer commit `docs: add <slug> plan`. El plan que se marca es el del worktree.
- Instala o prepara lo necesario: `node`/`npm` requieren `source ~/.nvm/nvm.sh` antes; ejecuta `npm install` en la raíz del worktree (monorepo con npm workspaces). Con `NODE_ENV=test` la BD es `:memory:`, así que no hace falta `.env`; si hiciera falta (p. ej. `JWT_SECRET`), crea uno de prueba sin versionarlo y nunca lo commitees.

### 3. Bucle por tarea (TDD estricto)

Para cada tarea pendiente, en el orden del plan, haz **exactamente** este ciclo:

1. **Red**: escribe primero el test que describe el comportamiento de la tarea (Vitest, `*.test.ts` junto al código; en servicios usa los mocks de `repositories/mocks/`). Ejecútalo (desde `packages/api`: `npx vitest run <archivo>`) y **comprueba que falla por la razón correcta** (no por un error de sintaxis o import). Si el test pasa sin implementar nada, el test es inútil: corrígelo.
2. **Green**: escribe el código mínimo para que pase. Nada más.
3. **Refactor**: limpia sin cambiar comportamiento, con los tests en verde.
4. **Suite completa**: ejecuta toda la suite (`npm test` desde la raíz), no solo el test nuevo. Debe estar en verde antes de seguir.
5. **Marcar la tarea**: en el plan del worktree, cambia `- [ ]` por `- [x]` de esa tarea.
6. **Commit**: un commit por tarea, que incluya código, tests y el plan actualizado. Stagea por ruta (nunca `git add -A` ni `git add .`).
7. Pasa a la siguiente tarea.

Reglas del ciclo:

- **Nunca escribas código de producción sin un test rojo previo.** Si una tarea no es testeable por naturaleza (p. ej. solo configuración o documentación), dilo explícitamente en el commit/resumen y verifícala de otra forma observable (p. ej. `npm test` o el build del frontend); no finjas un test artificial.
- Si una tarea es un refactor sin cambio de comportamiento, escribe primero tests de caracterización que pasen sobre el código actual, y refactoriza con ellos en verde.
- Si un test falla de forma inesperada y no lo resuelves tras un intento razonable, **detente y pregunta**; no desactives ni borres tests para avanzar, ni marques la tarea como hecha.
- No amplíes el alcance: si descubres trabajo fuera del plan, anótalo para el resumen final, no lo implementes.
- Respeta las convenciones del proyecto (sigue el estilo de la zona que edites: hexagonal + DDD en `contexts/employee/`, capas `routes → controllers → services → repositories` en el resto; imports con extensión `.js`; TypeScript estricto; sin dependencias nuevas). Los frontends no tienen tests: verifícalos con `npm run build -w <paquete>`.

### 4. Commits

- Formato [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/): `<tipo>(<alcance>): <descripción>`.
- **El mensaje va en inglés** (imperativo, minúscula inicial, sin punto final, ≤72 caracteres). Cita el id de la tarea en el cuerpo, p. ej. `Plan task T2`.
- Termina con la línea de atribución del entorno, si existe.
- Sin `--no-verify` ni `--amend`. El único `git push` permitido es el del paso 6 (crear la PR).
- Aquí no uses la skill/comando `commit` ni pidas confirmación del mensaje en cada tarea: el usuario ha autorizado un commit por tarea al invocar esta skill.

### 5. Criterios de aceptación

Cuando todas las tareas estén en `- [x]`:

1. Recorre **cada** criterio de aceptación y compruébalo con evidencia real: un test que lo cubra o una petición/ejecución concreta (p. ej. arrancar la API con `PORT` libre (`npm run dev:api`) y usar `curl` contra `/api/v1`, o inspeccionar el código para criterios estructurales). Ejecuta la suite completa una última vez.
2. Si un criterio no se cumple, añade al plan una tarea `- [ ]` de corrección (con su test) y vuelve al paso 3. No marques un criterio sin haberlo verificado.
3. Marca `- [x]` cada criterio verificado y haz un commit final `docs: mark <slug> acceptance criteria as met` (en inglés).

### 6. Crear la PR

Cuando todas las tareas estén en `- [x]` y los criterios de aceptación verificados:

1. Sube la rama desde el worktree: `git -C <worktree> push -u origin plan/<slug>`.
2. Crea la PR con `gh pr create` (ejecutado desde el worktree), contra la rama principal, con `--head plan/<slug>`:
   - Título en inglés en formato Conventional Commits (≤72 caracteres).
   - Cuerpo en español con el objetivo del plan, la lista de tareas completadas, el estado de los criterios de aceptación y `Closes #<número>` para enlazar la issue. Termina con la línea de atribución de PR del entorno, si existe.
3. Guarda la URL que devuelve `gh pr create`: es el enlace directo a la PR.
4. Si el push o la creación fallan, no inventes la URL: informa al usuario y detente. No crees la PR si quedan tareas o criterios sin cumplir.

### 7. Avisar por Slack

Con la PR creada, avisa en el canal `revisar-plan`. Obtén el id del canal con `mcp__slack__slack_list_channels` (busca el nombre `revisar-plan`) y publica con `mcp__slack__slack_post_message` un mensaje breve en español con el nombre del plan, el número de la issue y el **enlace directo a la PR**. Si el canal no existe o el envío falla, no inventes otro canal: díselo al usuario en el cierre.

### 8. Cierre

Muestra al usuario, en español:

- Enlace a la PR, rama y ruta del worktree.
- Lista de commits (`git log --oneline` desde la base).
- Resultado de la suite de tests y estado de cada criterio de aceptación.
- Trabajo fuera de alcance detectado o tareas no testeables, si los hay.

**No** hagas merge ni elimines el worktree: la integración de la PR la decide el usuario.
