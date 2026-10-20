---
name: plan-api-change
description: Planifica un cambio que toca la API (endpoints, rutas, controllers, DTOs, modelos expuestos, códigos de error, roles) y garantiza que el plan incluya mantener packages/api/openapi.yaml y su HTML (packages/api/docs/api.html) sincronizados. Úsala cuando el usuario pida planificar cualquier cambio en packages/api que afecte al contrato HTTP.
argument-hint: [descripción del cambio en la API]
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, mcp__slack__slack_list_channels, mcp__slack__slack_post_message
---

Planifica un cambio en la API **asegurando que el contrato OpenAPI se actualiza como parte del plan**. **No implementes nada**: esta skill solo planifica.

Petición del usuario: $ARGUMENTS

## Pasos

1. Sigue **todos** los pasos y reglas de la skill `plan-feature` (`../plan-feature/SKILL.md`) y usa su plantilla (`../plan-feature/assets/template.md`): clasificación, exploración del código, tareas de 5-10 min, criterios verificables, guardado en `docs/plans/<slug>.md` y aviso a Slack.
2. Lee además `packages/api/openapi.yaml` y localiza las rutas, esquemas y respuestas afectadas, para que las tareas citen secciones reales (`paths./api/v1/...`, `components.schemas.X`).
3. Determina el impacto en el contrato. Cuenta como cambio de contrato cualquiera de estos:
   - Rutas nuevas, eliminadas o con otro método/path (`app.ts` y `routes/`, `contexts/*/infrastructure/http/*.routes.ts`).
   - Cambios en el cuerpo de petición, query o params que leen los controllers.
   - Cambios en la forma de la respuesta (`toJSON`, DTOs de casos de uso, modelos).
   - Valores permitidos de enums (roles, unidades, categorías, estados) y reglas de validación visibles.
   - Códigos de estado y errores (`errors/DomainErrors.ts`, `errorHandler`, `authorize([...])`).
4. Si hay impacto en el contrato, añade al plan, **después de las tareas de código** y antes de los criterios:
   - **Una tarea "Actualizar openapi.yaml"** (~5-10 min; divídela por recurso si toca varios) con las secciones exactas a modificar: `paths`, `components.schemas`, `security`/roles en la descripción, respuestas de error. Debe respetar las convenciones del fichero: `operationId` único en camelCase, `tags` existentes, `$ref` a `components` en vez de duplicar, `security: []` en endpoints públicos, descripciones en español.
   - **Una tarea "Regenerar docs/api.html"** (~5 min): ejecutar `npm run docs:api` desde la raíz (valida con `redocly lint` y regenera `packages/api/docs/api.html`). Debe terminar sin errores.
5. Añade a los **criterios de aceptación**:
   - `npm run docs:api` termina sin errores (el documento es OpenAPI 3 válido).
   - Cada endpoint, campo o código de estado cambiado aparece reflejado en `packages/api/openapi.yaml` (enuméralos concretamente).
   - `packages/api/docs/api.html` está regenerado a partir del YAML final.
6. Si el cambio **no** altera el contrato (refactor interno, fix sin cambio de forma/estado), no añadas tareas de OpenAPI y dilo en una frase en el Objetivo ("Sin impacto en openapi.yaml").
7. Si el cambio altera comportamiento descrito en `docs/`, mantén también la tarea de actualizar ese documento (regla de `plan-feature`).

## Reglas

- El plan va en español; rutas y nombres de código tal cual en el repositorio.
- Las tareas de OpenAPI son tareas normales del plan: con casilla, estimación y archivos (`packages/api/openapi.yaml`, `packages/api/docs/api.html`). Se commitean junto con el resto (`docs(api): ...` en inglés si van en commit propio).
- No añadas dependencias al proyecto: `docs:api` usa `npx @redocly/cli`.
- No modifiques código ni `openapi.yaml` al planificar; el único archivo que escribes es el plan.

Al terminar, indica la ruta del plan y pregunta si quiere ajustar algo antes de implementarlo (con `implement-plan`).
