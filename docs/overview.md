# BiteTrack Overview

BiteTrack is a monorepo that packages every service, deployment asset, and script required to run the platform locally or in production. The codebase is organized for Docker-first deployments while still supporting traditional `npm` workflows for rapid development.

## Monorepo Layout

- `services/api`: Express + MongoDB REST API with Swagger docs, Jest tests, and operational scripts.
- `services/frontend`: React/Vite dashboard shell that surfaces system status and links to API/MCP entry points.
- `services/mcp`: Model Context Protocol server that exposes secure code execution and tool discovery endpoints.
- `infrastructure`: Docker Compose stack, Traefik config, and orchestration scripts used by `npm run init`.
- `legacy-docs`: Archived markdown from earlier phases. Consult only for historical context.
- `docs`: This directory. OpenAPI spec (`openapi.yaml`), Postman collections, and the refreshed markdown set.
- `packages/shared-types`: Placeholder workspace for code that can be shared across services.

## Service Matrix

| Service | Location | Runtime | Docker Name | Default Port(s) | Notes |
|---------|----------|---------|-------------|-----------------|-------|
| Frontend | `services/frontend` | React 18 + Vite | `bitetrack-frontend` | 80 (Traefik), 5173 dev | Health dashboard + CTA links. |
| API | `services/api` | Node 20/Express + Mongoose | `bitetrack-api` | 3000 (prod), 3001 dev | 9 route groups, Swagger UI at `/api/v2/docs`. |
| MCP | `services/mcp` | Node 20/Express | `bitetrack-mcp` | 3001 internal, exposed via `${MCP_PORT}` | SSE, sandboxed code execution, tool registry. |
| MongoDB | Docker | MongoDB 8 replica set | `bitetrack-mongodb` | 27017 | Replica set `rs0` with keyfile auth. |
| Traefik | Docker | Traefik 3.5 | `bitetrack-traefik` | 80 / 8080 | Routes `/`, `/api`, `/mcp`, dashboard on 8080. |

All containers share the `bitetrack_web` network; the API and MCP also join the internal `bitetrack_backend` network where MongoDB is isolated.

## Data & Traffic Flow

1. Traefik terminates HTTP requests and forwards them based on prefixes:
   - `/api` → `bitetrack-api`
   - `/mcp` → `bitetrack-mcp` (with strip-prefix middleware)
   - `/` → `bitetrack-frontend`
2. The API connects to MongoDB using credentials provisioned by the setup scripts and exposes health endpoints under `/api/v2/health`.
3. The MCP service talks to the API through the internal Docker network using the `API_URL` (`http://bitetrack-api:3000` inside Compose) and injects JWT tokens stored per session.
4. The frontend calls the API/MCP directly (local dev) or via Traefik using `VITE_API_URL`/`VITE_MCP_URL`.

## Documentation Set

The refreshed docs are intentionally short and practical:

- `docs/backend.md`: API architecture, environment, testing, and operational notes.
- `docs/frontend.md`: React app shape, health checks, and Vite configuration.
- `docs/mcp.md`: MCP endpoint surface, sandbox design, and tool loading.
- `docs/deployment.md`: Environment files, Docker workflows, and service health checks.
- `docs/scripts.md`: Reference for automation scripts under `infrastructure/scripts` and `services/api/scripts`.

Anything not covered here (older proposals, deprecated runbooks, etc.) now lives under `legacy-docs/`. Once a doc is updated, keep the canonical copy inside `docs/` or the service directory and move any superseded markdown to the archive.
