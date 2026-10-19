# CLAUDE.md

Este archivo da orientación a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

## Proyecto

Resttek: plataforma de gestión de restaurantes. Monorepo con npm workspaces (Node 22+, npm 10+) que contiene una API Express y cuatro paquetes Angular 21. La documentación está en español en `docs/` (arquitectura, glosario de dominio, modelo de datos); `README.md` explica la puesta en marcha y las credenciales del seed. No es un repositorio git.

| Paquete | Puerto | Función |
| --- | --- | --- |
| `packages/api` (`@resttek/api`) | 3000 | API REST con Express 5 + TypeScript + SQLite, prefijo `/api/v1` |
| `packages/web-admin` | 4200 | Panel de administración (admin, manager) |
| `packages/web-empleados` | 4201 | App de personal: cocina / barra / salón (cocinero, camarero, manager) |
| `packages/web-clientes` | 4202 | App de pedidos para clientes |
| `packages/web-shared` (`@resttek/web-shared`) | — | Librería Angular compartida (guard/servicio/store de auth, interceptores HTTP, componentes de login/registro, estilos, tokens); se consume como código fuente vía `main: src/index.ts` |

## Comandos

Ejecutar desde la raíz del repo:

```bash
npm install                 # instala todos los workspaces
npm run seed                # puebla SQLite (INSERT OR IGNORE, se puede repetir); imprime las credenciales
npm run dev:api             # tsx watch, http://localhost:3000 (GET /health)
npm run dev:admin           # también dev:empleados, dev:clientes (ng serve con proxy /api a :3000)
npm run docs:api            # valida packages/api/openapi.yaml y regenera packages/api/docs/api.html (npx @redocly/cli)
npm test                    # solo tests de la API (vitest run); los frontends no tienen script de test
```

Un solo test / modo watch (desde `packages/api`):

```bash
npx vitest run src/ruta/al/archivo.test.ts
npx vitest run -t "nombre del test"
npm run test:watch
```

No hay script de lint. Build de frontends: `npm run build -w @resttek/web-admin` (igual para las otras apps). Reinicia el servidor de desarrollo del frontend tras cambiar `web-shared`; Angular no detecta esos cambios en caliente.

Usuarios del seed: la contraseña es igual al email (p. ej. `admin@resttek.com`). Roles: admin, manager, cocinero, camarero, cliente.

## Arquitectura de la API (`packages/api/src`)

Conviven dos estilos arquitectónicos a propósito; sigue el estilo de la zona que edites:

- **Hexagonal + DDD** en `contexts/employee/` (`domain` → casos de uso en `application` → `infrastructure` con repositorio SQLite, servicio de auth Bcrypt/JWT, controllers, rutas y el cableado en `dependencies.ts`). Lo compartido (value object `Email`, `errorHandler`, middlewares authenticate/authorize) está en `contexts/shared/`.
- **Por capas** para restaurant, dish, ingredient y order: `routes/ → controllers/ → services/ → repositories/ (+ models/)`. Los repositorios tienen mocks en memoria en `repositories/mocks/`, usados por los tests de servicios.

Detalles que abarcan varios archivos:

- Todo el montaje de rutas está en `app.ts`. Los endpoints públicos (sin autenticación) cuelgan de `/api/v1/public/restaurants`; los recursos de un restaurante se anidan bajo `/restaurants/:restaurantId/...`.
- Los alias de paths de TypeScript (`@employee/*`, `@shared/*`, `@routes/*`, `@services/*`, `@repositories/*`, `@models/*`, `@errors/*`, `@config/*`, ...) se definen en `tsconfig.json` y vitest los resuelve con `vite-tsconfig-paths`. Los imports usan extensión `.js` (ESM, `module: nodenext`). El tsconfig es estricto, incluyendo `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`.
- Los tests están junto al código como `*.test.ts`. Con `NODE_ENV=test` la BD es `:memory:`; en otro caso es `packages/api/resttek.db`. Las tablas se crean al arrancar en `config/database.ts`, con `PRAGMA foreign_keys = ON`, así que las claves foráneas se aplican (los fixtures de test deben insertar primero las filas padre).
- Errores: lanza las clases de `errors/` (`AppError`, `DomainErrors`); el `errorHandler` compartido las traduce a respuestas HTTP.
- Auth: JWT (8h) firmado con `JWT_SECRET` (si no existe, usa un secreto de desarrollo fijo en el código). `PORT` es configurable.

## Particularidades del dominio

- Los clientes son filas de `employees` con `role='cliente'` y `restaurant_id = null`, por lo que el login y el registro comparten los endpoints de auth de empleados.
- Cada unidad pedida se convierte en su propio `OrderItem` con `quantity: 1`, para que cocina pueda seguir el estado de cada unidad (Preparando → Listo → Entregado).

## Arquitectura del frontend

- Componentes standalone + signals, carpetas por feature en `src/app/features/<feature>/` con `models/ pages/ services/ store/ <feature>.routes.ts` (web-admin, web-empleados). `web-clientes`, en cambio, centraliza models/services/store en `core/`.
- La auth, los interceptores y el login/registro vienen de `@resttek/web-shared`; no los dupliques en cada app.
- El `proxy.conf.json` de cada app redirige `/api` a `localhost:3000`; accede siempre por el puerto del frontend, no directamente a la API.

## Otros

- `docs/revisiones/` contiene revisiones de consistencia entre documentación y código (2026-08-19); actualiza el documento correspondiente en `docs/` cuando cambies el comportamiento que describe.
- `packages/api/openapi.yaml` es el contrato de la API (OpenAPI 3) y `packages/api/docs/api.html` su HTML generado con `npm run docs:api`. Al cambiar endpoints, DTOs, errores o roles, actualiza ambos; la skill `plan-api-change` lo incluye en los planes.
- `scripts/seed-issues.sh` crea issues de GitHub a partir de `scripts/issues.json` (requiere `gh` y `jq`).
