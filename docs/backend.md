# Backend (REST API)

The BiteTrack backend lives in `services/api` and provides every REST endpoint, authentication workflow, and reporting utility. It is an Express 4 application using native ES modules, Mongoose 8, and Swagger-generated documentation.

## Capabilities

- Routes under `/api/v2/*` organized by business function: `auth`, `sellers`, `customers`, `products`, `sales`, `inventory-drops`, `reporting`, and `test-data`.
- Centralized security middleware (Helmet, CORS, rate limiting) configured in `index.js`.
- Swagger UI served from `config/swagger.js`; dynamic docs live at `/api/v2/docs` and reference the same JSDoc annotations used by the codebase.
- Extensive automation scripts in `services/api/scripts/` for production bootstrap, test data seeding, and validation.

## Local Development

```
cd services/api
npm install
npm run predev  # validates .env.development and MongoDB
npm run dev     # nodemon + dotenv loader
```

Environment variables are loaded via `config/dotenv.js`, which resolves either `.env.development` or `.env` from the monorepo root based on `NODE_ENV`. Key settings:

- `MONGO_URI` – replica-set URI in Docker or localhost URI for dev.
- `JWT_SECRET` / `JWT_EXPIRES_IN`.
- `FRONTEND_URLS` – comma-separated origins used by the CORS whitelist.
- `PORT` – defaults to 3004 when running outside Docker; Compose maps container port 3000 to `${API_PORT}`.

## Directory Structure

- `controllers/` – Express handlers grouped by domain (auth, product, inventory, reporting, etc.).
- `routes/` – Router definitions with Swagger comments and validation logic.
- `models/` – Mongoose schemas for Sellers, Customers, Products, Sales, InventoryDrop, PendingSeller, and PasswordResetToken.
- `middleware/` – JWT auth guard plus centralized error handler.
- `config/` – `dotenv` loader and Swagger bootstrap.
- `utils/` – helper modules (`emailService.js`, `jwt.js`, `validation.js`).
- `tests/` – Jest suites split into `integration`, `unit`, and `performance`, each with supporting helpers under `tests/helpers`.
- `scripts/` – automation described in `docs/scripts.md`.
- `test-data/` – CSV/JSON fixtures consumed by seeding scripts and integration tests.

## Testing & Quality

- `npm run test` executes Jest with memory MongoDB (`mongodb-memory-server`), configured via `tests/setup.js`.
- `npm run lint` applies `eslint.config.js`; `npm run lint:fix` auto-formats issues.
- `npm run prettier:check` enforces formatting across the workspace.
- Performance tests live under `tests/performance`; they use captured datasets to stress sales filtering/reporting endpoints.

## Operational Notes

- Health endpoints:
  - `/api/v2/health` – general uptime.
  - `/api/v2/health/mongodb` – checks Mongoose connection state.
- Graceful shutdown logic (`gracefulShutdown`) handles `SIGTERM`, `SIGINT`, unhandled rejections, and uncaught exceptions.
- Rate limiting is set to 100 requests per 15-minute window; adjust `RATE_LIMIT_*` env vars if needed.
- Swagger spec also references `docs/openapi.yaml` for static tooling (e.g., Postman collection under `docs/postman-collection.json`).

When you modify routes or controllers, add or update the accompanying Swagger annotations so `/api/v2/docs` stays accurate. For large structural changes, document the update here and copy any superseded instructions into `legacy-docs/`.
