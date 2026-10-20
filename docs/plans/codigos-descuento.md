# Plan: Códigos de descuento y canje de puntos al pedir la cuenta

- **Tipo:** feature
- **Fecha:** 2026-10-20

## Objetivo

Cubrir la issue #8 "Códigos de descuentos" (etiquetas `proyecto:api`, `proyecto:web-admin`, `proyecto:web-clientes`). El admin de un restaurante podrá hacer CRUD de códigos de descuento y definir la relación puntos→descuento (p. ej. 10 puntos = 1 €, 100 puntos = 10 €). El cliente podrá, al **pedir la cuenta de un pedido**, aplicar un código y/o canjear sus puntos; la API calcula y congela subtotal, descuento y total. Hoy no existen "pedir la cuenta", totales en backend ni puntos de cliente, así que se crean con el alcance mínimo acordado: la cuenta es **por pedido** (`POST /orders/:id/bill`) y los puntos son un **saldo por cliente y restaurante** que solo se consulta y se descuenta al canjear. Queda fuera: acumulación de puntos (se siembran en el seed), pago, cierre de mesa y mostrar "cuenta solicitada" en web-empleados. Dudas abiertas: tipo de código (se asume `percent` o `fixed`, con `expires_at` y `max_uses` opcionales) y que el canje solo use tramos exactos de la regla (el cliente elige un tramo, no puntos libres). Se sigue el estilo por capas (como `table`), nombres de recurso en inglés (`discounts`).

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos. Ordénalas por dependencia y respeta la arquitectura de la zona (`routes → controllers → services → repositories → models`, o hexagonal en `contexts/employee/`).

- [ ] **T1 — Modelos de descuento, regla de puntos y cuenta** (~8 min)
  - Archivos: `packages/api/src/models/discount.model.ts`, `packages/api/src/models/bill.model.ts`
  - Detalle: definir `DiscountCode` (`id`, `restaurantId`, `code`, `type: 'percent' | 'fixed'`, `value`, `active`, `expiresAt?`, `maxUses?`, `usedCount`), `PointsRule` (`id`, `restaurantId`, `points`, `discountAmount`) y `Bill` (`orderId`, `subtotal`, `discountCode?`, `codeDiscount`, `pointsUsed`, `pointsDiscount`, `total`, `createdAt`), con `toJSON` como en `table.model.ts`. Respetar `exactOptionalPropertyTypes`.
- [ ] **T2 — Errores de dominio** (~5 min)
  - Archivos: `packages/api/src/errors/DomainErrors.ts`
  - Detalle: añadir `DiscountCodeNotFoundError` (404), `DiscountCodeInvalidError` (400: inactivo, caducado, agotado), `DuplicateDiscountCodeError` (409), `InsufficientPointsError` (400), `PointsRuleNotFoundError` (404) y `BillAlreadyRequestedError` (409), siguiendo el formato de los existentes.
- [ ] **T3 — Tablas SQLite** (~8 min)
  - Archivos: `packages/api/src/config/database.ts`
  - Detalle: `CREATE TABLE IF NOT EXISTS` para `discount_codes` (`UNIQUE(restaurant_id, code)`), `points_rules`, `customer_points` (`client_id`, `restaurant_id`, `balance`, PK compuesta) y `bills` (`order_id` PK, FK a `orders`). FKs a `restaurants`/`employees`. Cuidar el `;` entre bloques del array.
- [ ] **T4 — Repositorio de códigos de descuento + mock** (~10 min)
  - Archivos: `packages/api/src/repositories/discount.repository.ts`, `packages/api/src/repositories/mocks/MockDiscountRepository.ts`
  - Detalle: interfaz y `SqliteDiscountRepository` (`findByRestaurant`, `findById`, `findByCode(restaurantId, code)`, `save`, `update`, `delete`, `incrementUsed`) más su mock en memoria.
- [ ] **T5 — Repositorios de reglas de puntos, saldo y cuentas + mocks** (~10 min)
  - Archivos: `packages/api/src/repositories/points.repository.ts`, `packages/api/src/repositories/bill.repository.ts`, `packages/api/src/repositories/mocks/MockPointsRepository.ts`, `packages/api/src/repositories/mocks/MockBillRepository.ts`
  - Detalle: reglas (`findRulesByRestaurant`, `saveRule`, `deleteRule`), saldo (`getBalance`, `setBalance`) y cuentas (`findByOrderId`, `save`). Todo el SQL queda solo aquí.
- [ ] **T6 — Servicio de códigos de descuento (CRUD)** (~10 min)
  - Archivos: `packages/api/src/services/discount.service.ts`
  - Detalle: `create`/`update`/`delete`/`list`/`getById` con `ensureRestaurantExists`, validación (`code` no vacío y único por restaurante, `value > 0`, `percent` ≤ 100, `expiresAt` válida) y `randomUUID()`.
- [ ] **T7 — Tests del servicio de códigos** (~8 min)
  - Archivos: `packages/api/src/services/discount.service.test.ts`
  - Detalle: Vitest con `MockDiscountRepository` y `MockRestaurantRepository`: alta correcta, código duplicado, `percent` > 100, restaurante inexistente, borrado.
- [ ] **T8 — Servicio de reglas de puntos** (~8 min)
  - Archivos: `packages/api/src/services/points.service.ts`, `packages/api/src/services/points.service.test.ts`
  - Detalle: CRUD de reglas (`points > 0`, `discountAmount > 0`, `points` único por restaurante) y `getBalance(clientId, restaurantId)`. Tests con mocks.
- [ ] **T9 — Servicio de cuenta: cálculo y solicitud** (~10 min)
  - Archivos: `packages/api/src/services/bill.service.ts`
  - Detalle: `requestBill(orderId, clientId, { discountCode?, pointsRuleId? })`: verifica que el pedido es del cliente, que no tiene cuenta (`BillAlreadyRequestedError`), calcula `subtotal` desde `dishPrice`, valida el código (activo, no caducado, `usedCount < maxUses`), valida saldo contra la regla elegida, aplica ambos descuentos con `total >= 0`, descuenta puntos, incrementa `usedCount` y guarda la cuenta. `getBill(orderId)`.
- [ ] **T10 — Tests del servicio de cuenta** (~10 min)
  - Archivos: `packages/api/src/services/bill.service.test.ts`
  - Detalle: sin descuentos, código `percent`, código `fixed`, código caducado/agotado/inexistente, canje con saldo suficiente e insuficiente, código + puntos, total nunca negativo, segunda solicitud (409), pedido ajeno.
- [ ] **T11 — Controllers** (~10 min)
  - Archivos: `packages/api/src/controllers/discount.controller.ts`, `packages/api/src/controllers/points.controller.ts`, `packages/api/src/controllers/bill.controller.ts`
  - Detalle: arrow-functions con `toJSON` y `next(error)` como `table.controller.ts`. Bill: `POST` (201) y `GET`. Points: reglas y `GET` del saldo propio.
- [ ] **T12 — Rutas y montaje en `app.ts`** (~10 min)
  - Archivos: `packages/api/src/routes/discount.routes.ts`, `packages/api/src/routes/points.routes.ts`, `packages/api/src/routes/order.routes.ts`, `packages/api/src/app.ts`
  - Detalle: montar `/api/v1/restaurants/:restaurantId/discounts` (escritura `authorize(['admin'])`, lectura `admin`/`manager`), `/api/v1/restaurants/:restaurantId/points-rules` (escritura `admin`; `GET` también `cliente` para ver tramos) y `/api/v1/restaurants/:restaurantId/points/me` (`cliente`); añadir `POST/GET /orders/:id/bill` con `authorize(['cliente'])`. Cableado Sqlite como en `table.routes.ts` con `Router({ mergeParams: true })`.
- [ ] **T13 — Tests de rutas** (~10 min)
  - Archivos: `packages/api/src/routes/discount.routes.test.ts`, `packages/api/src/routes/bill.routes.test.ts`
  - Detalle: supertest como en `table.routes.test.ts` (BD `:memory:`, insertar primero filas padre): 403 para camarero en `POST /discounts`, 401 sin token, 201 al crear, 409 código duplicado, `POST /orders/:id/bill` con código válido y con código inválido (400).
- [ ] **T14 — Seed** (~5 min)
  - Archivos: `packages/api/src/scripts/seed.ts`
  - Detalle: `INSERT OR IGNORE` de un código (`BIENVENIDO10`, 10 % en `rest-1`), dos tramos (10 puntos = 1 €, 100 puntos = 10 €) y saldo de 150 puntos para `cliente@resttek.com` en `rest-1`, con ids deterministas.
- [ ] **T15 — Actualizar openapi.yaml** (~10 min)
  - Archivos: `packages/api/openapi.yaml`
  - Detalle: `tags` (añadir "Descuentos"), `paths` `/api/v1/restaurants/{restaurantId}/discounts`, `.../discounts/{id}`, `.../points-rules`, `.../points-rules/{id}`, `.../points/me` y `/api/v1/orders/{id}/bill` (POST y GET); `components.schemas` `DiscountCode`, `DiscountCodeInput`, `PointsRule`, `PointsRuleInput`, `Bill`, `BillRequest`; respuestas 400/401/403/404/409 y roles en la descripción. `operationId` únicos en camelCase, `$ref` a `components`, descripciones en español.
- [ ] **T16 — Regenerar docs/api.html** (~5 min)
  - Archivos: `packages/api/docs/api.html`
  - Detalle: ejecutar `npm run docs:api` desde la raíz; debe terminar sin errores.
- [ ] **T17 — Actualizar documentación de `docs/`** (~8 min)
  - Archivos: `docs/arquitectura/arquitectura-api.md`, `docs/dominio/modelo-datos.md`, `docs/dominio/glosario.md`
  - Detalle: endpoints nuevos (sección Endpoints) y dominios por capas; ER y tablas `discount_codes`, `points_rules`, `customer_points`, `bills`; glosario: código de descuento, puntos, regla de puntos, cuenta.
- [ ] **T18 — web-admin: modelo, servicio y store de descuentos** (~10 min)
  - Archivos: `packages/web-admin/src/app/features/discounts/models/discount.model.ts`, `.../services/discount.service.ts`, `.../store/discount.store.ts`
  - Detalle: copiar el patrón de `features/mesas/` (signals privados con `asReadonly()`, `firstValueFrom`, `DISCOUNT_ERROR_MESSAGES` y `discountErrorMessage`). Servicio contra `${environment.apiUrl}/restaurants/${restaurantId}/discounts`; incluir también las llamadas a `points-rules`.
- [ ] **T19 — web-admin: páginas de lista y formulario de códigos** (~10 min)
  - Archivos: `.../features/discounts/pages/discount-list/`, `.../pages/discount-form/`, `.../features/discounts/discounts.routes.ts`
  - Detalle: lista con borrado confirmado y formulario con `FormsModule`/`ngModel` (tipo, valor, activo, caducidad, usos máximos), como `mesa-list`/`mesa-form`; `DISCOUNT_ROUTES` con `''`, `'new'`, `':id/edit'`.
- [ ] **T20 — web-admin: página de tramos puntos→descuento** (~8 min)
  - Archivos: `.../features/discounts/pages/points-rules/`
  - Detalle: tabla editable de tramos (puntos → euros de descuento) con alta y borrado, usando el store de T18.
- [ ] **T21 — web-admin: ruta y menú "Descuentos"** (~5 min)
  - Archivos: `packages/web-admin/src/app/app.routes.ts`, `packages/web-admin/src/app/core/layout/shell.component.html`, `packages/web-admin/src/app/app.config.ts`
  - Detalle: bloque `{ path: 'discounts', loadChildren: ... DISCOUNT_ROUTES }` bajo `restaurants/:restaurantId`, entrada `.sub-nav-item` con icono `ticket` registrado en `app.config.ts`. Verificar con `npm run build -w @resttek/web-admin`.
- [ ] **T22 — web-clientes: modelo y servicio de cuenta** (~8 min)
  - Archivos: `packages/web-clientes/src/app/core/models/bill.model.ts`, `packages/web-clientes/src/app/core/services/bill.service.ts`
  - Detalle: interfaces `Bill`, `PointsRule`, `BillRequest`; servicio con `requestBill(orderId, body)`, `getBill(orderId)`, `getPointsRules(restaurantId)` y `getMyPoints(restaurantId)`. Centralizado en `core/` como el resto de la app.
- [ ] **T23 — web-clientes: UI "Pedir la cuenta" en el detalle del pedido** (~10 min)
  - Archivos: `packages/web-clientes/src/app/features/orders/order-detail.component.ts`
  - Detalle: junto a `.ticket-total`, botón "Pedir la cuenta" con campo de código + selector de tramo de puntos (solo tramos ≤ saldo), mensajes de error de la API en español, y tras solicitarla mostrar desglose subtotal / descuento / puntos / total a partir de la respuesta del backend (no del cálculo cliente). Verificar con `npm run build -w @resttek/web-clientes`.

## Criterios de aceptación

- [ ] `POST /api/v1/restaurants/rest-1/discounts` con token de admin y `{ code: "VERANO5", type: "fixed", value: 5 }` devuelve 201; repetir el mismo `code` devuelve 409; con token de camarero devuelve 403 y sin token 401.
- [ ] `GET/PUT/DELETE /api/v1/restaurants/rest-1/discounts/{id}` funcionan para admin y devuelven 404 para un id inexistente.
- [ ] Un admin puede crear `points-rules` (`10 puntos → 1 €`, `100 puntos → 10 €`); `points = 0` devuelve 400.
- [ ] `POST /api/v1/orders/{id}/bill` con `{ discountCode: "BIENVENIDO10" }` devuelve 201 con `subtotal`, `codeDiscount` = 10 % del subtotal y `total` correcto; un código inexistente, caducado o agotado devuelve 4xx con mensaje de error y no crea la cuenta.
- [ ] Con `pointsRuleId` del tramo de 100 puntos, el saldo del cliente baja 100 y `pointsDiscount` = 10 €; con saldo insuficiente devuelve 400 y el saldo no cambia. `total` nunca es negativo.
- [ ] Solicitar la cuenta de un pedido que ya la tiene devuelve 409; de un pedido ajeno, 403/404; con rol distinto de `cliente`, 403.
- [ ] `npm test` pasa en `packages/api`, con tests nuevos de servicios (descuentos, puntos, cuenta) y rutas.
- [ ] En web-admin, el menú del restaurante muestra "Descuentos" y permite crear, editar y borrar códigos y tramos; `npm run build -w @resttek/web-admin` termina sin errores.
- [ ] En web-clientes, el detalle de un pedido permite aplicar un código y/o canjear un tramo y muestra el total devuelto por la API; `npm run build -w @resttek/web-clientes` termina sin errores.
- [ ] `npm run docs:api` termina sin errores (OpenAPI 3 válido).
- [ ] Cada endpoint nuevo (`/discounts`, `/discounts/{id}`, `/points-rules`, `/points-rules/{id}`, `/points/me`, `/orders/{id}/bill`) y los schemas `DiscountCode`, `PointsRule`, `Bill` aparecen en `packages/api/openapi.yaml`.
- [ ] `packages/api/docs/api.html` está regenerado a partir del YAML final.
