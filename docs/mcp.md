# MCP Server

The MCP (Model Context Protocol) server in `services/mcp` powers our AI-assisted workflows. It exposes SSE connections, a sandboxed code executor, and a tool registry that can act on behalf of authenticated users.

## Surface Area

- `GET /health` – reports uptime, environment, and active session counts.
- `GET /` – capability overview plus available endpoints.
- `GET /sse` – establishes an event stream, creates a session, and keeps it alive with heartbeat events. Each connection receives a UUID used elsewhere.
- `POST /execute` – runs arbitrary JavaScript inside a `vm2` sandbox with injected utilities (`apiClient`, `sessionManager`, tool functions).
- `GET /tools` – lists tool categories/files discovered under `services/mcp/tools`.
- `GET /tools/:category/:tool` – returns the raw source for a specific tool.
- `GET /sessions` – exposes runtime session statistics for observability.

## Architecture

- `index.js` wires Express, Helmet, CORS, JSON parsing, SSE endpoint, and error handling.
- `lib/sessionManager.js` tracks session metadata, JWT tokens, and cleans up idle sessions every 15 minutes.
- `lib/codeExecutor.js` hosts the sandbox:
  - Loads all tool modules dynamically and injects their exports into the VM.
  - Creates an Axios client scoped to `API_URL` (default `http://bitetrack-api:3000` in Docker) and automatically attaches per-session JWT tokens.
  - Wraps code inside an async IIFE and enforces a 10-second timeout.
- `tools/` currently contains the `auth/login.js` helper; add new categories/files here to extend MCP abilities without touching the core runtime.

## Environment Variables

Set through `.env.*` files or Docker Compose:

- `MCP_PORT` – defaults to 3001 inside containers (mapped to `${MCP_PORT:-4000}`).
- `API_URL` – where the API can be reached from the MCP container/network.
- `JWT_SECRET` – shared secret so the MCP can generate or validate tokens alongside the API.
- `GEMINI_API_KEY` – optional key for Gemini integrations.
- `NODE_ENV` – used only for logging.

## Local Development

```
cd services/mcp
npm install
npm run dev   # nodemon index.js
```

Hit `http://localhost:3001/health` (or the port in `.env.development`) to confirm the service is up. The SSE endpoint logs connection lifecycle events to the console.

## Deployment Notes

- Compose labels register the MCP under the `/mcp` prefix via Traefik. The `mcp-stripprefix` middleware removes `/mcp` before the request reaches Express.
- Health checks in Docker use `wget http://localhost:3001/health`.
- When adding new tools or changing execution limits, update this file and archive the previous explanation inside `legacy-docs/services/mcp/`.
