# BiteTrack Frontend

Modern web interface for BiteTrack business management platform.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Nginx** - Production web server

## Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev
```

Server runs on `http://localhost:5173`

## Build

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

## Docker

```bash
# Build image
docker build -t bitetrack-frontend .

# Run container
docker run -p 80:80 bitetrack-frontend
```

## API Integration

The frontend expects these backend services to be available (via Traefik routing):

- `/api/*` → BiteTrack API
- `/mcp/*` → MCP AI Server

## Features (Boilerplate)

Current implementation includes:
- Landing page with system status
- Service health checks
- Responsive design
- Modern gradient UI
- Links to API documentation

## Planned Features

- [ ] User authentication (JWT)
- [ ] Dashboard with analytics
- [ ] Sales management interface
- [ ] Inventory management
- [ ] Customer database UI
- [ ] Real-time notifications
- [ ] AI chat interface (MCP integration)
- [ ] Reporting and exports

## Project Structure

```
frontend/
 src/
    App.jsx # Main app component
    App.css # App styles
    main.jsx # React entry point
    index.css # Global styles
 public/ # Static assets
 index.html # HTML template
 vite.config.js # Vite configuration
 nginx.conf # Nginx config for production
 Dockerfile # Multi-stage Docker build
 package.json # Dependencies and scripts
```

## Configuration

### Development
Vite dev server configured in `vite.config.js`:
- Host: `0.0.0.0` (Docker compatible)
- Port: `5173`

### Production
Nginx serves static files from `/usr/share/nginx/html`:
- Gzip compression enabled
- SPA routing (all routes → index.html)
- Static asset caching
- Security headers

## Testing Routes

Access through Traefik (when full stack is running):

```bash
# Frontend
http://localhost/

# API (proxied)
http://localhost/api/health

# MCP (proxied)
http://localhost/mcp/health
```

## Related Services

- **API**: `services/api/` - Backend REST API
- **MCP**: `services/mcp/` - AI server
- **Infrastructure**: `infrastructure/` - Docker orchestration
