---
name: plan-feature
description: Planifica un nuevo desarrollo, una corrección de código o un refactor generando un plan con objetivo, tareas pequeñas (5-10 min cada una) y criterios de aceptación. Úsala cuando el usuario pida planificar, diseñar o desglosar un cambio antes de implementarlo.
argument-hint: [número de la issue de GitHub]
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(gh issue view:*), Bash(gh issue comment:*), mcp__slack__slack_list_channels, mcp__slack__slack_post_message
---

Genera un plan de implementación siguiendo exactamente la estructura de [template.md](template.md). **No implementes nada**: esta skill solo planifica.

La tarea a planificar vive en una issue de GitHub; el usuario te indica su número. Número de issue / petición del usuario: $ARGUMENTS

## Pasos

1. **Obtener la issue**: el número de la issue viene en `$ARGUMENTS`. Si falta o no es un número válido, pídeselo al usuario con `AskUserQuestion`; no lo adivines. Lee la issue con `gh issue view <número> --json number,title,body,labels,comments` y úsala como fuente de la petición (título, descripción, etiquetas y comentarios relevantes). Si `gh` falla o la issue no existe, informa al usuario y detente.
2. **Entender la petición**: Si la issue es ambigua (no se sabe el objetivo o el alcance), usa `AskUserQuestion` antes de seguir. No preguntes lo que puedas deducir de la issue o del código.
3. **Clasificar**: Determina si es `feature`, `fix` o `refactor`.
4. **Explorar el código**: Lee `CLAUDE.md` y los archivos afectados (en `packages/api/src`: `contexts/employee/` o `routes`, `controllers`, `services`, `repositories`, `models`; en frontend, `packages/web-*`) para que las tareas citen rutas reales. Consulta `docs/` (arquitectura, dominio) cuando el cambio afecte al comportamiento que describe.
5. **Redactar el plan** rellenando la plantilla [template.md](template.md) sin quitar ni renombrar secciones:
   - **Objetivo**: qué y por qué, en pocas frases.
   - **Tareas**: lista ordenada de tareas con casilla `- [ ]`, archivos afectados y detalle.
   - **Criterios de aceptación**: condiciones verificables (códigos de estado, respuestas, comportamiento observable).
6. **Guardar**: escribe el plan en `docs/plans/<slug-en-kebab-case>.md` (crea la carpeta si no existe) y muestra el contenido al usuario.
7. **Publicar en la issue**: publica el plan completo como comentario de la issue con `gh issue comment <número> --body-file docs/plans/<slug>.md`. Si falla, informa al usuario del problema y continúa.
8. **Avisar por Slack**: una vez guardado el plan, avisa en el canal `revisar-plan` de que está listo para revisarse. Obtén el id del canal con `mcp__slack__slack_list_channels` (busca el nombre `revisar-plan`) y publica con `mcp__slack__slack_post_message` un mensaje breve en español con el título del plan y su ruta (`docs/plans/<slug>.md`). Si el canal no existe o el envío falla, no inventes otro canal: informa al usuario del problema y continúa.

## Reglas

1. **Tamaño de las tareas**: cada tarea debe poder hacerse en 5-10 minutos y tener un único propósito. Si una tarea parece más larga, divídela. Indica la estimación en minutos en cada una.
2. **Respeta las convenciones del proyecto** al definir las tareas:
   - Sigue el estilo de la zona: hexagonal + DDD en `packages/api/src/contexts/employee/` (`domain` → `application` → `infrastructure`) y por capas `routes → controllers → services → repositories (+ models)` en restaurant, dish, ingredient y order. El acceso a la base de datos vive solo en los repositorios.
   - TypeScript estricto, imports con extensión `.js`, errores con las clases de `errors/`.
   - Frontend: componentes standalone + signals, carpetas por feature (`models/ pages/ services/ store/`); auth, interceptores y login/registro vienen de `@resttek/web-shared`.
   - Sin dependencias nuevas si no hacen falta.
   - Si el cambio altera comportamiento descrito en `docs/`, incluye una tarea para actualizar el documento correspondiente.
3. **Orden**: las tareas van de la capa más baja a la más alta (models → repositories → services → controllers → routes; en `contexts/employee/`: domain → application → infrastructure) cuando sea una feature, y cada una debe poder revisarse de forma independiente.
4. **Tests**: añade una tarea de verificación (Vitest, `*.test.ts` junto al código; los tests de servicios usan los mocks de `repositories/mocks/`) cuando el cambio tenga lógica comprobable.
5. **Criterios de aceptación verificables**: nada de "funciona bien"; cada criterio debe poder comprobarse con una petición concreta o un resultado observable. Incluye al menos un caso de error cuando aplique.
6. **Sin relleno**: no inventes secciones extra ni tareas de "documentar" o "revisar" si no aportan. Si hay dudas abiertas, anótalas en una frase dentro del Objetivo.
7. **Idioma**: el plan va en español; los nombres de código, rutas y métodos, tal cual aparecen en el repositorio.
8. **Sin implementar**: no modifiques código fuente ni hagas commits; el único archivo que escribes es el plan (el comentario en la issue (paso 7) y el aviso a Slack (paso 8) son lo único externo permitido).

Al terminar, indica la ruta del plan guardado, el enlace al comentario de la issue y pregunta si quiere ajustar algo antes de empezar a implementarlo.
