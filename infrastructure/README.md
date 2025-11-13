# 🏗️ BiteTrack Infrastructure

Complete Docker Compose orchestration with Traefik reverse proxy for all BiteTrack services.

## 🎯 Architecture Overview

```
                                 Internet
                                     ↓
                              Port 80 (HTTP)
                                     ↓
                            ┌────────────────┐
                            │    Traefik     │ ← Port 8080 (Dashboard)
                            │  Reverse Proxy │
                            └────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ↓                ↓                ↓
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │   Frontend   │ │  BiteTrack   │ │     MCP      │
            │   (React)    │ │     API      │ │  AI Server   │
            │   Nginx:80   │ │  Express:3000│ │  Express:3001│
            └──────────────┘ └──────────────┘ └──────────────┘
                                     │                │
                                     └────────┬───────┘
                                              ↓
                                     ┌────────────────┐
                                     │    MongoDB     │
                                     │  Replica Set   │
                                     └────────────────┘
```

## 🚀 Quick Start

### One-Command Setup

```bash
./scripts/init.sh
```

This automated script will:

1. Check prerequisites (Docker, Docker Compose)
2. Create `.env` with secure secrets
3. Build all service images
4. Initialize MongoDB replica set
5. Start all services
6. Run health checks

### Manual Setup

```bash
# 1. Create environment file
cp ../.env.example ../.env
# Edit .env with your values

# 2. Build services
docker compose build

# 3. Start everything
docker compose up -d

# 4. Initialize MongoDB
docker compose exec mongodb mongosh --eval "rs.initiate()"
```

## 📍 Service Access

| Service      | URL                                 | Description             |
| ------------ | ----------------------------------- | ----------------------- |
| **Frontend** | http://localhost                    | React web interface     |
| **API**      | http://localhost/bitetrack          | REST API endpoints      |
| **API Docs** | http://localhost/bitetrack/api-docs | Interactive Swagger UI  |
| **MCP**      | http://localhost/mcp                | AI chat server          |
| **Traefik**  | http://localhost:8080               | Reverse proxy dashboard |

## 🔧 Common Commands

### Service Management

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart services
docker compose restart

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f bitetrack-api
docker compose logs -f bitetrack-frontend
docker compose logs -f bitetrack-mcp
```

### Build & Deploy

```bash
# Rebuild specific service
docker compose build bitetrack-api
docker compose up -d bitetrack-api

# Rebuild all services
docker compose build --parallel

# Full rebuild (no cache)
docker compose build --no-cache
```

### Health Checks

```bash
# Check all service status
docker compose ps

# Manual health checks
curl http://localhost/
curl http://localhost/bitetrack/health
curl http://localhost/mcp/health
```

### MongoDB Management

```bash
# Connect to MongoDB shell
docker compose exec mongodb mongosh -u admin -p

# Check replica set status
docker compose exec mongodb mongosh --eval "rs.status()"

# View databases
docker compose exec mongodb mongosh --eval "show dbs"
```

## 🌐 Routing Configuration

Traefik automatically routes traffic based on path prefixes:

| Path           | Target Service | Middleware          |
| -------------- | -------------- | ------------------- |
| `/`            | Frontend       | None                |
| `/api/*`       | API            | None                |
| `/bitetrack/*` | API            | None                |
| `/mcp/*`       | MCP            | Strip `/mcp` prefix |

### Priority Rules

1. `/mcp/*` → MCP (highest priority)
2. `/api/*`, `/bitetrack/*` → API
3. `/*` → Frontend (lowest priority, catch-all)

## 🔐 Security

### Network Isolation

- **`web` network**: Public-facing (Traefik, Frontend, API, MCP)
- **`backend` network**: Internal only (MongoDB, API, MCP)
  - MongoDB is NOT exposed to the `web` network
  - Only API and MCP can access MongoDB

### Environment Variables

All sensitive values should be in `.env` (never commit this file):

- `MONGO_ROOT_PASSWORD` - MongoDB admin password
- `JWT_SECRET` - API authentication secret
- `GEMINI_API_KEY` - MCP AI service key

Generate secure values:

```bash
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 24  # For passwords
```

## 📦 Service Configuration

### Frontend (React + Nginx)

- **Build**: Multi-stage (Node.js build → Nginx serve)
- **Port**: Internal 80, External via Traefik
- **Health**: `GET /health`
- **Static files**: Cached for 1 year
- **SPA routing**: All paths → `index.html`

### API (Node.js + Express)

- **Build**: Single-stage production
- **Port**: Internal 3000
- **Health**: `GET /bitetrack/health`
- **Database**: MongoDB via `backend` network

### MCP (Node.js + Express)

- **Build**: Single-stage production
- **Port**: Internal 3001
- **Health**: `GET /health`
- **API Access**: Via `backend` network

### MongoDB

- **Image**: `mongo:8.0-noble`
- **Replica Set**: `rs0` (required for transactions)
- **Volumes**: Persistent data in `mongodb_data`
- **Network**: `backend` only (not exposed externally)

## 🐛 Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# View service logs
docker compose logs

# Check .env file exists
ls -la ../.env
```

### Can't access services

```bash
# Verify Traefik is running
docker compose ps traefik

# Check Traefik logs
docker compose logs traefik

# View Traefik dashboard
open http://localhost:8080
```

### MongoDB connection issues

```bash
# Check MongoDB is healthy
docker compose ps mongodb

# Verify replica set
docker compose exec mongodb mongosh --eval "rs.status()"

# Check connection from API
docker compose exec bitetrack-api wget -O- mongodb:27017
```

### Build failures

```bash
# Clean and rebuild
docker compose down -v
docker system prune -a
docker compose build --no-cache
```

## 📊 Monitoring

### Traefik Dashboard

Access at http://localhost:8080 to view:

- Active routers and services
- HTTP request metrics
- Health check status
- Error logs

### Docker Stats

```bash
# Real-time resource usage
docker stats

# Specific service
docker stats bitetrack-api
```

### Logs

```bash
# All services
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Since 1 hour ago
docker compose logs --since 1h
```

## 🚀 Production Deployment

### Enable HTTPS

1. Uncomment SSL sections in `traefik/traefik.yml`
2. Set `ACME_EMAIL` in `.env`
3. Update `DOMAIN` in `.env`
4. Restart Traefik:

```bash
docker compose up -d traefik
```

### Performance Tuning

```bash
# Scale API horizontally
docker compose up -d --scale bitetrack-api=3

# Resource limits (add to docker-compose.yml)
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

### Backup

```bash
# MongoDB backup
docker compose exec mongodb mongodump --out /data/backup

# Copy backup from container
docker cp bitetrack-mongodb:/data/backup ./mongodb-backup
```

## 📚 Related Documentation

- [API README](../services/api/README.md)
- [Frontend README](../services/frontend/README.md)
- [MCP README](../services/mcp/README.md)
- [Traefik Docs](https://doc.traefik.io/traefik/)
- [Docker Compose Docs](https://docs.docker.com/compose/)

## 🤝 Contributing

When adding new services:

1. Create service directory in `services/`
2. Add standalone Dockerfile
3. Add service to `docker-compose.yml`
4. Configure Traefik labels for routing
5. Update this README
