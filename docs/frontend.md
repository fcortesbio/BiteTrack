# Frontend (React + Vite)

The current frontend (`services/frontend`) is a lightweight React 18 application that validates system health and links users to the API and MCP entry points. It is intentionally minimal while the production dashboard is in progress.

## Stack

- React 18 with hooks (`App.jsx` is the root component).
- Vite 6 build tooling with `@vitejs/plugin-react`.
- Plain CSS (`App.css`, `index.css`) for styling; no component framework yet.

## Environment

The app reads two Vite environment variables (populated by `infrastructure/scripts/setup-env.sh`):

- `VITE_API_URL` – defaults to `http://localhost:3004` outside Docker.
- `VITE_MCP_URL` – defaults to `http://localhost:4004`.

They can be overridden via `.env.development` or `.env.production` in the repo root (Vite automatically injects variables prefixed with `VITE_`).

## Commands

```
cd services/frontend
npm install
npm run dev       # starts Vite dev server (default port 5173)
npm run build     # outputs static assets to dist/
npm run preview   # serves dist/ locally
```

## Features

- Health checks: `App.jsx` pings `/api/v2/health`, `/api/v2/health/mongodb`, and `/health` on the MCP service, surfacing status cards.
- CTA buttons link directly to the API docs, API health endpoint, and MCP landing route.
- Styles highlight the core product pillars (analytics, inventory, AI assistant) to orient stakeholders.

## Deployment

The Docker image (see `services/frontend/Dockerfile`) builds the Vite bundle and serves it behind Nginx, but in production traffic is routed through Traefik:

- Traefik router `frontend` handles all unmatched routes (`PathPrefix(`/`)` with lowest priority).
- MCP and API prefixes take precedence, so deep links like `/api/v2/docs` bypass the SPA.

When the dashboard expands, keep this doc updated with the new routes/components and move superseded writeups into `legacy-docs/services/frontend/`.
