# Deployment & Operations

This document covers how to configure environments, start the Docker stack, and verify system health. Use it alongside `docs/scripts.md`, which explains each helper script in detail.

## Environment Files

`infrastructure/scripts/setup-env.sh` (invoked by `npm run init`) generates:

- `.env.development` – local ports (API 3001, MCP 4001, Frontend 5001) and a Mongo URI that targets `localhost:27017`.
- `.env.production` – defaults API/MCP/Frontend to 3000/4000/5000 and points MongoDB to the Docker service (`mongodb:27017`).
- `.secrets` – convenience file with the generated credentials (never commit).
- `infrastructure/.env` – symlink to whichever `.env.*` file Compose should consume.

If you update environment variables manually, re-run `npm run init` or edit the files at the repo root. The API reads variables via `services/api/config/dotenv.js`, so any change takes effect after restarting the service.

## Docker Compose

Two equivalent compose files exist (`docker-compose.yml` at the root and inside `infrastructure/`). Both define:

- Traefik reverse proxy on ports 80/8080.
- MongoDB replica set + init container with keyfile mounted from `../keyfile`.
- `bitetrack-api`, `bitetrack-frontend`, and `bitetrack-mcp` builds from the `services/*` directories.
- Shared networks: `bitetrack_web` (external) and `bitetrack_backend` (internal).
- Named volumes: `mongodb_data`, `traefik_logs`.

Common commands from the repo root:

```
npm run docker:up        # docker compose -f infrastructure/docker-compose.yml up -d
npm run docker:down      # stop stack
npm run docker:logs      # follow all service logs
npm run docker:clean     # tear down stacks + prune volumes (irreversible)
```

Ports exposed to the host can be tuned via `.env.production` (`API_PORT`, `MCP_PORT`, `FRONTEND_PORT`). The MCP container still listens on 3001 internally, so Traefik routes `/mcp` traffic there.

## Health Checks

After `docker compose up -d`, validate:

- `http://localhost/api/v2/health` – served by the API container.
- `http://localhost/api/v2/docs` – Swagger UI.
- `http://localhost/api/v2/health/mongodb` – ensures MongoDB replica set is online.
- `http://localhost/mcp/health` – MCP service health.
- `http://localhost` – frontend shell.
- `http://localhost:8080` – Traefik dashboard (insecure mode enabled for local operations).

Each service also defines Docker-level health checks (`wget` or `mongosh`). Compose waits for MongoDB and the init container before starting the API, which in turn must be healthy before the MCP starts.

## Production Considerations

- Replace the sample `keyfile.example` with a secure keyfile before running Mongo replica sets in production. Mount it at `keyfile`.
- Disable `--api.insecure=true` in Traefik and configure real entrypoints/certificates before exposing this stack publicly.
- Configure `FRONTEND_URLS` to match the domains served by the proxy (comma-separated list).
- Provide `GEMINI_API_KEY` if the MCP requires access to Gemini models.
- Keep `legacy-docs/` out of deployment artifacts—it is meant for reference only.
