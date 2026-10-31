# Conduit API: backend RealWorld

Backend de la especificación [RealWorld](https://github.com/gothinkster/realworld) («Conduit»)
con **Node.js + TypeScript + Express 5 + Prisma 6 + SQLite**.

| Comprobación | Resultado |
| --- | --- |
| Colección oficial de la API (Hurl) | **13/13 ficheros, 154/154 peticiones** |
| Colección oficial Bruno (espejo generado de la Hurl) | **13/13 carpetas, 154/154 peticiones** |
| Pruebas propias (Vitest + Supertest) | **95/95** (unitarias + integración) |
| `npm audit` | **0 vulnerabilidades** (también se comprueba en el CI) |
| Especificación verificada | `gothinkster/realworld@c5aecdf` (30/10/2026), OpenAPI `2.0.0` |

## Plan

El contrato manda: antes de escribir código leí el `openapi.yml` y los 13 ficheros Hurl de la
versión vigente, y extraje lo que la prosa no dice pero la suite exige (mensajes de error exactos,
`body` ausente en los listados, orden de `tagList` conservado, normalización de `""` a `null`,
política de contraseñas NIST en `PUT /user`, prioridad 401 → 404 → 403). Después construí el
corte vertical por capas (validación con Zod, servicios con la lógica de negocio, repositorios con
Prisma), empezando por autenticación y artículos. La colección oficial se ejecuta tal cual desde un
submódulo git fijado al commit verificado, para que nadie pueda «ajustar» las pruebas, y las pruebas
propias cubren lo que la suite no comprueba: casos límite, seguridad y reglas que la especificación
deja abiertas. Cada decisión que se aparta de la especificación, o la completa, está en
[Desviaciones](#desviaciones-y-huecos-de-la-especificación).

## Puesta en marcha

Requisitos: Node ≥ 22 (probado con 24); para la suite oficial y Git.

```bash
git clone --recurse-submodules https://github.com/MarcoMaya098/realworld-conduit-node-typescript.git
cd realworld-conduit-node-typescript
npm install
cp .env.example .env          # DATABASE_URL, JWT_SECRET, PORT (+ opciones documentadas)
npm run db:migrate            # crea prisma/dev.db a partir de las migraciones
npm run dev                   # http://localhost:3000/api
```

| Script | Qué hace |
| --- | --- |
| `npm test` | Pruebas propias, contra una base `prisma/test.db` que se recrea en cada ejecución |
| `npm run test:api` | Colección Hurl oficial contra el servidor en marcha (`HOST`, por defecto `http://localhost:3000`) |
| `npm run test:api:bruno` | Colección Bruno oficial vía `npx @usebruno/cli` (no necesita `bun`, solo Node) |
| `npm run typecheck` | `tsc --noEmit` en modo estricto |
| `npm run build` / `npm start` | Compila a `dist/` y lo ejecuta. Con `NODE_ENV=production`: exige `JWT_SECRET` de 32+ caracteres y HTTPS, cierra CORS y apaga Swagger |

Un solo fichero de la suite: `bash scripts/run-api-tests.sh spec/specs/api/hurl/articles.hurl`.

**Probar a mano (OpenAPI / Swagger UI):** con el servidor en marcha, abre
<http://localhost:3000/api/docs/>. Se sirve el `openapi.yml` **oficial** del submódulo, no una
copia; solo se cambia `servers` para que «Try it out» llame a este servidor. El JSON está en
`/api/openapi.json` (se puede importar en Postman o Insomnia). Para los endpoints protegidos:
`POST /users` o `POST /users/login`, copia el `token` y en **Authorize** escribe `Token <token>`
(con el prefijo, porque la especificación define el esquema como una cabecera `apiKey`). En
producción Swagger está apagado por defecto (`DOCS_ENABLED`).

## Seguridad

| Medida | Cómo |
| --- | --- |
| **HTTPS obligatorio** | `REQUIRE_HTTPS` (activo por defecto en producción): las lecturas por HTTP plano se redirigen con 301 a `https://` y el resto se rechaza con 403 `{"errors":{"https":["required"]}}`. Un POST no se redirige porque la contraseña ya habría viajado en claro, y reintentarlo en silencio lo ocultaría al cliente. TLS nativo con `TLS_CERT_FILE`/`TLS_KEY_FILE`, o terminado en un proxy con `TRUST_PROXY_HOPS` para respetar `X-Forwarded-Proto`. `/api/health` queda accesible por HTTP para balanceadores internos |
| **Cabeceras (helmet)** | HSTS, `nosniff`, CSP `default-src 'self'` (compatible con Swagger UI, que no usa scripts inline), protección contra framing, sin `X-Powered-By`. `upgrade-insecure-requests` solo cuando se exige HTTPS, para no romper `http://localhost` en desarrollo |
| **CORS estricto** | Lista blanca en `CORS_ORIGINS`. Por defecto: cualquier puerto de `localhost` en desarrollo y **ningún origen** en producción. Solo `GET/POST/PUT/DELETE` y las cabeceras `Content-Type`, `Authorization` y `X-Request-Id`; sin credenciales, porque la autenticación va por cabecera y no por cookies |
| **JWT** | HS256 fijado (se rechaza `alg: none`), `issuer` y `audience` verificados, caducidad de 30 días, secreto de 32+ caracteres obligatorio en producción, y el usuario del token debe seguir existiendo |
| **Rate limiting** | Registro y login (detalles en [Operación](#operación)) |
| **Saneamiento de entrada** | Ver abajo |
| **Inyección SQL** | Solo consultas parametrizadas de Prisma; la única consulta raw (`SELECT 1` del health) es una plantilla sin parámetros |
| **Dependencias** | `npm audit` a 0 y verificado en el CI |

**Saneamiento de entrada.** Todo lo que entra pasa por un esquema Zod antes de llegar a la lógica:

- Se eliminan los caracteres de control (salvo salto de línea y tabulador) y se recortan los
  espacios.
- Todos los textos tienen longitud máxima (título 200, descripción 500, cuerpo 100.000, comentario
  10.000, bio 1.000, máximo 20 tags de 50 caracteres) y el cuerpo JSON, 1 MB.
- Las claves desconocidas se descartan: no se puede inyectar `authorId`, `passwordHash`, etc.
- `image` solo acepta URLs `http(s)`, lo que bloquea `javascript:` y `data:`.
- El username solo admite letras (de cualquier alfabeto), números, `.`, `_` y `-`, porque acaba
  dentro de URLs (`/profiles/:username`).

Lo que **no** se hace es escapar HTML al guardar. La API devuelve JSON y el cuerpo de los artículos
es Markdown, así que escapar al entrar corrompería los datos y produciría doble escapado en el
cliente. Escapar al mostrar es responsabilidad del frontend (la suite E2E de RealWorld lo prueba en
`xss-security.spec.ts`). Hay una prueba que fija este comportamiento.

## Operación

- **`GET /api/health`**: responde 200 `{"status":"ok","database":"ok","uptimeSeconds":…}` tras
  ejecutar un `SELECT 1`, o 503 `{"status":"error","database":"unreachable"}` si la base de datos
  no responde. El CI lo usa para esperar a que el servidor arranque.
- **Logs estructurados** con [pino](https://getpino.io): una línea JSON por petición (`req.id`,
  método, URL, `statusCode`, `responseTime`), con nivel `warn` para 4xx y `error` para 5xx. No hay
  `console.*` en el código.
  - **Request id:** cada petición lleva un id que se devuelve en la cabecera `X-Request-Id`; si el
    cliente envía uno con formato válido, se reutiliza para poder trazar la petición entre servicios.
  - **Datos sensibles:** el cuerpo de las peticiones no se registra nunca (así no aparecen
    contraseñas), y `Authorization` y `Cookie` se ocultan.
  - **Formato:** `npm run dev` muestra los logs legibles con `pino-pretty`; en producción salen en
    JSON. El nivel se controla con `LOG_LEVEL`.
- **Rate limiting** en los dos endpoints sin autenticar que se pueden abusar. Superar el límite
  devuelve 429 `{"errors":{"requests":["too many, try again later"]}}` con las cabeceras estándar
  `RateLimit` y `Retry-After`.
  - **`POST /users`:** 100 registros por IP cada 15 minutos (`REGISTER_RATE_LIMIT_MAX`).
  - **`POST /users/login`:** 10 intentos **fallidos** por IP y email cada 15 minutos
    (`LOGIN_RATE_LIMIT_MAX`). Los logins correctos no cuentan, así que el uso normal nunca se
    bloquea. Y como la clave es IP + cuenta, un atacante no puede bloquear el acceso de todos los
    usuarios desde una misma IP.
  - **Compatibilidad con la suite:** cada ejecución de la suite oficial hace 21 registros, así que
    caben 4 ejecuciones seguidas por ventana (comprobado con 3). Para más, sube el límite o usa `0`
    para desactivarlo. Las pruebas propias lo desactivan y prueban el limitador por separado con un
    límite de 2.
  - **Limitación:** el contador vive en la memoria del proceso. Con varias instancias haría falta
    un store compartido (Redis). Detrás de un proxy hay que fijar `TRUST_PROXY_HOPS` para que el
    límite use la IP real del cliente.


## Arquitectura

Clean architecture con capas por tipo e inyección de dependencias por constructor:

```
src/
  domain/            NÚCLEO. No importa Express ni Prisma.
    entities/          User, Profile, Article, Comment, Pagination (tipos planos)
    repositories.ts    Interfaces (puertos) de persistencia: UserRepository, ArticleRepository…
    security.ts        Interfaces PasswordHasher y TokenService
    errors.ts          DomainError (unauthenticated, forbidden, not_found, conflict, invalid)
  dtos/              Contratos de datos: entradas de los servicios y formas JSON de la especificación.
  types/             Tipos de configuración y cableado (AppOptions, Container…) y la extensión
                     de Request de Express (express.d.ts).
  services/          LÓGICA: reglas de negocio, permisos, slugs, conflictos. Reciben interfaces.
  repositories/      DATOS: implementaciones Prisma de los puertos; includes, tipos de fila
                     (prisma-rows.types.ts) y mappers filas → entidades.
  infrastructure/    Cliente Prisma, ScryptPasswordHasher, JwtTokenService.
  validators/        VALIDACIÓN: forma, límites y saneamiento de la entrada (Zod). Sin E/S.
  controllers/       HTTP: valida → llama al servicio → código de estado; presenters.ts da la
                     forma JSON de la especificación (DTOs).
  routes/            Tabla de rutas: método + path → middleware de auth → controller.
  middleware/        auth, security (helmet, CORS, HTTPS), rate-limit, request-logger,
                     error-handler (DomainError → código HTTP).
  container.ts       Raíz de composición: único sitio que elige implementaciones y las inyecta.
  app.ts, server.ts, config.ts, env.ts, logger.ts, docs.ts (Swagger UI)
  lib/               validation (Zod → formato de error RealWorld), slug, http
```

Los archivos de comportamiento (servicios, controllers, rutas, middleware, repositorios) no
declaran interfaces ni tipos: los contratos viven en `domain/`, `dtos/`, `types/` o en un
`*.types.ts`.

Las dependencias apuntan hacia dentro: `controllers → services → domain ← repositories`.
Los servicios solo conocen interfaces del dominio, así que se prueban con dobles sin base de
datos (`test/unit/services.test.ts`), y cambiar Prisma por otra persistencia solo afecta a
`repositories/`, `infrastructure/` y `container.ts`. `createApp(overrides, container)` acepta
otro contenedor para los tests.


## Decisiones

- **Alcance: la API completa, no solo autenticación y artículos.**  La
  colección oficial no se puede separar: `errors_authorization.hurl` crea comentarios,
  `errors_articles.hurl` prueba favoritos y el feed, y `feed.hurl` depende de los follows. Para
  entregar la colección **pasando** implementé también perfiles, comentarios, favoritos y tags, con
  la misma arquitectura. El corte vertical principal (usuarios + artículos) es el que tiene más
  pruebas propias.
- **Express 5:** propaga los errores de los handlers `async` sin envoltorios.
- **Prisma 6.19, no 7/8:** la 7 obliga a usar driver adapters y la 8 es una release candidate. Una
  vulnerabilidad del CLI de Prisma 6 (`deepmerge-ts`) se corrige con un `override` a la 8.0.2.
- **Contraseñas con `scrypt` de `node:crypto`**, sin dependencias nativas: bcrypt trunca en
  72 bytes y la política NIST pide aceptar al menos 64 caracteres. Hay prueba de que no se trunca.
  Si el email no existe, el login compara igualmente contra un hash ficticio para no revelar por
  tiempo de respuesta qué emails están registrados.
- **El JWT lleva el id del usuario (`sub`), no el username:** el token sigue siendo válido después de
  cambiar el username o el email (lo cubre una prueba propia). El middleware comprueba además que
  el usuario existe.
- **Slugs:** título en kebab-case sin tildes (`¿Cómo entrenar…?` → `como-entrenar`); si el título ya
  existe se añade un sufijo aleatorio. Al cambiar el título se regenera el slug (lo pide la
  especificación) y el antiguo deja de resolver.
- **`tagList`:** una tabla de unión explícita con una columna `position` conserva el orden del
  cliente (la suite comprueba `tagList[0]`). Las tags se recortan, se eliminan las vacías y se
  quitan duplicados.
- **`updatedAt` se fija en el servicio**, no con `@updatedAt`, para que una edición que solo cambia
  las tags también lo actualice.
- **Unicidad:** se comprueba antes de escribir para poder informar de `username` y `email` a la vez
  con 409. Si dos peticiones simultáneas chocan, el error `P2002` de Prisma también se traduce a 409.

## Desviaciones y huecos de la especificación

La suite oficial pasa completa; nada de lo siguiente la contradice. Donde la especificación calla,
elegí la opción más defendible y la documento aquí:

| Tema | Comportamiento | Motivo |
| --- | --- | --- |
| Alcance | API completa (ver Decisiones) | La colección oficial depende de todos los recursos |
| Contraseña en el registro | Mismas reglas NIST que en `PUT /user` (8–256 caracteres) | La suite solo las exige al actualizar; no tiene sentido aceptar al registrarse una contraseña que luego no se puede volver a poner. El login solo comprueba que no esté vacía, para no bloquear cuentas antiguas si cambia la política |
| Formato del email | 422 `is invalid` si no es `algo@algo.tld` | La especificación no valida el formato |
| Formato del username | Letras, números, `.`, `_`, `-`; máximo 40 | Va dentro de URLs; la especificación no lo restringe |
| Longitudes máximas | En todos los textos (ver [Seguridad](#seguridad)) | La especificación no fija límites |
| `image` | Solo URLs `http(s)` | Evita `javascript:` y `data:` en un campo que los clientes renderizan |
| JSON mal formado | 422 `{"errors":{"body":["is not valid JSON"]}}` | El OpenAPI no define 400; 422 es su código para una entrada inválida |
| Token inválido en endpoints con auth opcional | 401 `is invalid` (no se ignora) | El OpenAPI declara 401 en esos endpoints; ignorarlo ocultaría fallos al cliente |
| Esquema `Authorization` | `Token` (especificación) y además `Bearer` | Compatibilidad con clientes genéricos |
| Seguirse a uno mismo | 422 `{"errors":{"profile":["cannot follow yourself"]}}` | La especificación no lo define |
| Follow/unfollow y favorite/unfavorite repetidos | Idempotentes, 200 | La especificación no lo define |
| Borrar comentarios | Solo el autor del comentario (no el autor del artículo) | La especificación no lo define |
| Id de comentario no numérico | 404 `comment not found` | No puede corresponder a ningún comentario |
| Orden de los comentarios | Del más antiguo al más reciente | La especificación no lo define |
| `GET /tags` | Solo las tags en uso, de más a menos usada | Las tags huérfanas de artículos borrados no aportan nada |
| `PUT` sin campos | 422 `must contain at least one field` | El OpenAPI dice «at least one field is required» |
| Paginación | `limit ≥ 1`, `offset ≥ 0`, enteros, si no 422; sin máximo de `limit` | El OpenAPI define los mínimos pero no un máximo |
| 429, 403 `https`, `/api/health` | Respuestas y endpoint adicionales | Rate limiting, HTTPS obligatorio y health check (ver Seguridad y Operación) |
| Runner de Bruno | `scripts/run-api-tests-bruno.sh` usa `npx` en lugar del `bun x` del script oficial | Mismo CLI y mismas opciones; así basta con Node |

## Pruebas propias

- `test/unit/`: validación (formato de error, normalización, saneamiento, límites, política de
  contraseñas, paginación), seguridad (hash sin truncado; JWT manipulado, con otro secreto, otro
  issuer/audience, `alg: none` o caducado) y slugs.
  - `services.test.ts`: reglas de negocio con repositorios falsos inyectados, sin base de datos
    (404 antes que 403, solo el autor edita o borra, slug y `updatedAt` al actualizar, sufijo
    ante colisión, login con tiempo constante, 409 con todos los campos, contraseña hasheada).
- `test/integration/`: la app real con Supertest contra SQLite. Cubren lo que la suite oficial no:
  orden y forma exacta de las respuestas, `favorited`/`following` según quién mira, filtros
  combinados, borrado en cascada, slug tras cambiar el título, 404 antes que 403, un comentario que
  no se puede borrar desde el slug de otro artículo, idempotencia y 401 `is missing` frente a
  `is invalid`.
  - `operations.test.ts`: health, request ids y rate limiting.
  - `security.test.ts`: cabeceras de helmet, CORS (origen permitido, denegado, preflight, imitación
    de `localhost`), HTTPS (redirección, rechazo, proxy de confianza), Swagger desactivable y
    saneamiento de punta a punta.

## Con más tiempo

- Ejecutar la suite E2E de Playwright con un frontend.
- Pasar a Postgres para producción. El esquema no depende de nada específico de SQLite.
