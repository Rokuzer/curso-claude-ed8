# Plan: Documentación de la API con OpenAPI 3

- **Tipo:** feature
- **Fecha:** 2026-10-19

## Objetivo

Cubrir la issue "Generar documentación con OpenAPI" de `scripts/issues.json`: crear `packages/api/openapi.yaml` (OpenAPI 3.0.3) que describa todos los endpoints del backend (`app.ts`, `routes/` y `contexts/employee/infrastructure/http/`) y generar `packages/api/docs/api.html`, un HTML autocontenido para publicar. Se añade el script raíz `docs:api` que valida con `redocly lint` y regenera el HTML con `npx @redocly/cli`, sin dependencias nuevas. No cambia ningún comportamiento de la API (sin impacto en `src/`). Existe un borrador previo en el scratchpad de la sesión que sirve de punto de partida, pero cada tarea debe verificarse contra el código real. Duda abierta: `PATCH /orders/{orderId}/items/{itemId}/status` devuelve 400 cuando el pedido no existe (mientras `GET /orders/{id}` devuelve 404); se documenta tal cual, sin corregirlo.

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos. Los cambios son solo documentación/configuración, así que no son testeables con Vitest; se verifican con `npm run docs:api` y contrastando con el código.

- [x] **T1 — Añadir el script `docs:api` en la raíz** (~5 min)
  - Archivos: `package.json`
  - Detalle: añadir `"docs:api"` que ejecute `npx --yes @redocly/cli@latest lint packages/api/openapi.yaml && npx --yes @redocly/cli@latest build-docs packages/api/openapi.yaml -o packages/api/docs/api.html`. Sin tocar `dependencies`/`devDependencies`.
- [x] **T2 — Crear la base de `openapi.yaml`** (~10 min)
  - Archivos: `packages/api/openapi.yaml`
  - Detalle: `openapi: 3.0.3`, `info` (descripción en español: prefijo `/api/v1`, JWT 8h, roles, clientes como `employees` con `role=cliente`, una unidad por `OrderItem`), `servers` (`http://localhost:3000`), `tags` (Sistema, Auth, Empleados, Restaurantes, Ingredientes, Platos, Pedidos, Público). En `components`: `securitySchemes.bearerAuth`, `parameters` (`Id`, `RestaurantId`), `responses` (`Unauthorized`, `Forbidden`, `RestaurantNotFound`, `IngredientNotFound`, `DishNotFound`) y `schemas` de enums (`Role`, `IngredientUnit`, `DishCategory`, `OrderStatus`) y errores (`DomainError` para `errorHandler`, `SimpleError` para middlewares y pedidos). Incluir `GET /health` con `security: []`.
- [x] **T3 — Documentar auth y empleados** (~10 min)
  - Archivos: `packages/api/openapi.yaml`
  - Detalle: `paths` `/api/v1/auth/login` (200, 401 `InvalidCredentialsError`) y `/api/v1/auth/register` (201, 400) con `security: []`; `/api/v1/employees` (GET con `limit`, `offset`, `role`; POST), `/api/v1/employees/{id}` (GET, 404) y `/api/v1/restaurants/{restaurantId}/employees` (GET), todos solo `admin`. Schemas `LoginRequest`, `RegisterRequest`, `AuthResponse`, `Employee`, `CreateEmployeeRequest`. Contrastar con `AuthController.ts`, `EmployeeController.ts` y `Employee.ts`.
- [x] **T4 — Documentar restaurantes (privados y públicos)** (~10 min)
  - Archivos: `packages/api/openapi.yaml`
  - Detalle: `/api/v1/restaurants` (GET: `admin` ve todos, el resto solo el suyo o `[]`; POST solo `admin`), `/api/v1/restaurants/{id}` (GET, PUT solo `admin`, 404), `/api/v1/public/restaurants` y `/api/v1/public/restaurants/{id}` con `security: []`. Schemas `Restaurant` y `RestaurantInput` (regla del teléfono `PHONE_REGEX` de `restaurant.service.ts`). Contrastar con `restaurant.controller.ts` y las dos rutas.
- [x] **T5 — Documentar ingredientes** (~7 min)
  - Archivos: `packages/api/openapi.yaml`
  - Detalle: `/api/v1/restaurants/{restaurantId}/ingredients` (GET `admin`/`manager`/`cocinero`; POST `admin`) y `.../{id}` (GET, PUT, DELETE 204, 404). Schemas `Ingredient`, `IngredientCreateRequest` (`currentStock` por defecto 0), `IngredientUpdateRequest`. Contrastar con `ingredient.routes.ts`, `ingredient.controller.ts` y `ingredient.model.ts`.
- [ ] **T6 — Documentar platos (privados y públicos)** (~8 min)
  - Archivos: `packages/api/openapi.yaml`
  - Detalle: `/api/v1/restaurants/{restaurantId}/dishes` (GET `admin`/`manager`/`camarero`/`cocinero`; POST `admin`/`manager`), `.../{id}` (GET, PUT, DELETE 204, 404) y `/api/v1/public/restaurants/{restaurantId}/dishes` (solo `available = true`, `security: []`). Schemas `Dish`, `DishIngredient`, `DishCreateRequest`, `DishUpdateRequest`. Contrastar con `dish.routes.ts`, `dish.controller.ts` y `dish.model.ts`.
- [ ] **T7 — Documentar pedidos** (~10 min)
  - Archivos: `packages/api/openapi.yaml`
  - Detalle: `POST /api/v1/orders` (201; 400 con `SimpleError`), `GET /orders/active` (query `restaurantId` obligatoria, 400 si falta), `GET /orders/mine`, `GET /orders/{id}` (404) y `PATCH /orders/{orderId}/items/{itemId}/status` (204; 400 para pedido/unidad inexistente o estado inválido). Schemas `OrderCreateRequest`, `Order`, `OrderItem` (`quantity` siempre 1; campos `dishName`, `dishPrice`, `dishCategory`, `restaurantName`, `restaurantLogoUrl` solo en lecturas). Contrastar con `order.routes.ts`, `order.controller.ts` y `order.model.ts`.
- [ ] **T8 — Verificar cobertura contra el código** (~8 min)
  - Archivos: `packages/api/openapi.yaml`
  - Detalle: listar los `router.<método>(...)` de `routes/*.routes.ts` y `contexts/employee/infrastructure/http/*.routes.ts` junto con los montajes de `app.ts`, y comprobar que cada método+path existe en `paths` con los roles de `authorize([...])` correctos. Corregir lo que falte o sobre.
- [ ] **T9 — Generar `docs/api.html`** (~5 min)
  - Archivos: `packages/api/docs/api.html`
  - Detalle: ejecutar `npm run docs:api` desde la raíz. Debe validar sin errores (los avisos de `operation-4xx-response` en endpoints públicos son aceptables) y producir el HTML. Comprobar que el archivo existe y no está vacío.
- [ ] **T10 — Documentar el mantenimiento en `CLAUDE.md`** (~5 min)
  - Archivos: `CLAUDE.md`
  - Detalle: en la sección "Otros", indicar que `packages/api/openapi.yaml` es el contrato de la API y `packages/api/docs/api.html` su HTML generado con `npm run docs:api`, que ambos se actualizan al tocar endpoints, DTOs, errores o roles, y que la skill `plan-api-change` lo incluye en los planes. Añadir `npm run docs:api` a la lista de comandos.

## Criterios de aceptación

- [ ] `npm run docs:api` desde la raíz termina con código 0 y `redocly lint` informa de documento válido (sin errores).
- [ ] `packages/api/openapi.yaml` declara `openapi: 3.0.3` y contiene los 29 pares método+path de la API: `GET /health`; auth (`POST /login`, `POST /register`); empleados (`GET`/`POST /employees`, `GET /employees/{id}`, `GET /restaurants/{restaurantId}/employees`); restaurantes (`GET`/`POST /restaurants`, `GET`/`PUT /restaurants/{id}`); ingredientes (`GET`/`POST` y `GET`/`PUT`/`DELETE /{id}`); platos (`GET`/`POST` y `GET`/`PUT`/`DELETE /{id}`); públicos (`GET /public/restaurants`, `GET /public/restaurants/{id}`, `GET /public/restaurants/{restaurantId}/dishes`); pedidos (`POST /orders`, `GET /orders/active`, `GET /orders/mine`, `GET /orders/{id}`, `PATCH /orders/{orderId}/items/{itemId}/status`).
- [ ] Los endpoints públicos y de login/registro/health tienen `security: []`, y el resto usa `bearerAuth` con los roles de `authorize([...])` indicados en su descripción.
- [ ] El YAML refleja los códigos de error reales: 401 para token inválido y `InvalidCredentialsError`, 403 para rol insuficiente, 404 para recursos inexistentes por `errorHandler`, 400 para validaciones, y 400 (no 404) en `PATCH .../status` para pedido inexistente.
- [ ] `packages/api/docs/api.html` existe, se generó a partir del YAML final y se abre en un navegador mostrando todos los tags (Sistema, Auth, Empleados, Restaurantes, Ingredientes, Platos, Pedidos, Público).
- [ ] `git diff` de `packages/api/package.json` y `package.json` no muestra dependencias nuevas, y `npm test` sigue en verde sin cambios en `packages/api/src`.
- [ ] `CLAUDE.md` menciona `openapi.yaml`, `api.html`, `npm run docs:api` y la skill `plan-api-change`.
