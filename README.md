<div align="center">

# BiteTrack

Enterprise business intelligence platform for food businesses.  
This repo contains every service (API, frontend, MCP), infrastructure asset, and automation script required to run BiteTrack locally or via Docker.

</div>

## Status

- REST API: Stable and fully documented via Swagger (`/api/v2/docs`).
- Frontend: Minimal React shell that surfaces system health; dashboard work in progress.
- MCP server: Actively developed; already supports SSE sessions, sandboxed code execution, and tool discovery.
- Documentation: This README + the focused docs under `docs/`. Older markdown lives in `legacy-docs/` for reference only.

## Repository Layout

| Path                | Description                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `services/api`      | Express + MongoDB backend with tests, scripts, and Swagger config.                                                |
| `services/frontend` | React/Vite client used for health/status views.                                                                   |
| `services/mcp`      | Model Context Protocol server and runtime tools.                                                                  |
| `infrastructure`    | Docker Compose stack, Traefik config, and setup scripts invoked by `npm run init`.                                |
| `docs`              | Fresh documentation (`overview`, service guides, deployment, scripts) plus `openapi.yaml` and Postman collection. |
| `legacy-docs`       | Archived markdown copied verbatim from earlier phases—do not treat as canonical.                                  |

## Getting Started

```bash
git clone https://github.com/fcortesbio/BiteTrack.git
cd BiteTrack
npm install          # installs root + workspace deps
npm run init         # interactive setup (creates env files, keyfile, Docker stack)
```

After the wizard finishes:

```bash
npm run docker:up    # start Traefik, MongoDB, API, MCP, frontend
npm run docker:logs  # follow logs
```

Health checks:

- `http://localhost/api/v2/health` (API)
- `http://localhost/api/v2/docs` (Swagger UI)
- `http://localhost/api/v2/health/mongodb`
- `http://localhost/mcp/health`
- `http://localhost` (frontend shell)
- `http://localhost:8080` (Traefik dashboard; disable insecure mode before production)

For local development outside Docker, navigate into each service directory and run the usual `npm run dev`/`npm run test` commands. The API uses `.env.development` and expects MongoDB on `localhost:27017` (the `check-dev-env.sh` script verifies this before dev builds).

## Documentation

| File                 | Focus                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `docs/overview.md`   | High-level monorepo summary, service matrix, data flow.            |
| `docs/backend.md`    | REST API internals, directory layout, env requirements, QA.        |
| `docs/frontend.md`   | React/Vite client behavior and configuration.                      |
| `docs/mcp.md`        | MCP endpoints, session management, sandbox design.                 |
| `docs/deployment.md` | Environment files, Docker orchestration, health verification.      |
| `docs/scripts.md`    | Reference for `infrastructure/scripts` and `services/api/scripts`. |
| `docs/roadmap.md`    | Delivery plan with milestones and suggested board setup.           |

`legacy-docs/` contains the previous markdown files exactly as they were. Keep it around for historical context, but update the files above when making process changes.

## Contributing

1. Ensure `npm run lint` and `npm run test` pass inside `services/api` (the largest codebase).
2. Document architectural or workflow changes under `docs/` and move any superseded markdown into `legacy-docs/`.
3. Prefer scripts in `infrastructure/scripts/` for environment automation so `npm run init` remains the single entry point.

## License

MIT © fcortesbio
