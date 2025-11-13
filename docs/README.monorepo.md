# 🍔 BiteTrack Monorepo

Enterprise Business Intelligence Platform for Food Businesses

## 📁 Repository Structure

```
BiteTrack/                          # Monorepo root
├── services/                       # Application services
│   ├── api/                       # REST API (Express + MongoDB)
│   ├── frontend/                  # (Coming soon) React/Next.js UI
│   └── mcp/                       # (Coming soon) AI/MCP server
├── packages/                       # Shared code
│   └── shared-types/              # Constants, types, schemas
├── infrastructure/                 # Deployment configs
│   ├── docker-compose.yml         # Orchestration
│   ├── traefik/                   # Reverse proxy config
│   └── scripts/                   # Deployment scripts
└── docs/                          # Documentation

```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9
- Docker & Docker Compose (for full stack)

### Install All Services

```bash
npm install
```

This installs dependencies for all workspaces (services + packages).

### Development Commands

```bash
# Run all services in development mode
npm run dev

# Run specific service
npm run dev -w services/api

# Test all services
npm test

# Test specific service
npm run test -w services/api

# Lint all code
npm run lint

# Build all services
npm run build
```

## 📦 NPM Workspaces

This monorepo uses **NPM Workspaces** for managing multiple packages:

### Benefits

- ✅ Shared dependencies (single `node_modules`)
- ✅ Local package linking (no `npm link` needed)
- ✅ Unified scripts across services
- ✅ Consistent versions

### Adding a New Service

1. Create directory structure:

```bash
mkdir -p services/new-service
cd services/new-service
npm init -y
```

2. Add to workspace (automatic - already configured in root `package.json`)

3. Reference shared packages:

```json
{
  "dependencies": {
    "@bitetrack/shared-types": "*"
  }
}
```

4. Run from root:

```bash
npm install
npm run dev -w services/new-service
```

## 🐳 Docker Development

### Run entire stack:

```bash
cd infrastructure
docker compose up -d
```

Services available at:

- **API**: http://localhost:3000
- **Frontend**: (coming soon)
- **Traefik Dashboard**: http://localhost:8080 (when Traefik added)

### Build specific service:

```bash
docker compose build bitetrack-api
```

## 📚 Documentation

- **API Documentation**: [services/api/README.md](services/api/README.md)
- **Shared Types**: [packages/shared-types/README.md](packages/shared-types/README.md)
- **Full API Reference**: [docs/API-documentation.md](docs/API-documentation.md)
- **Interactive API Docs**: http://localhost:3000/api-docs (when running)

## 🛠️ Workspace Commands Reference

### Root Level (affects all workspaces)

```bash
npm install                     # Install all workspace dependencies
npm run test                    # Run tests in all workspaces
npm run lint                    # Lint all code
npm run clean                   # Remove all node_modules
```

### Service Level (specific workspace)

```bash
npm run test -w services/api           # Test API only
npm run dev -w services/frontend       # Run frontend dev server
npm run build -w services/mcp          # Build MCP service
```

### Package Management

```bash
# Add dependency to specific workspace
npm install express -w services/api

# Add dev dependency
npm install -D jest -w services/api

# Add shared package to service
# (just reference in package.json, npm install handles linking)
```

## 🏗️ CI/CD

(Coming soon)

- GitHub Actions workflow for testing all services
- Automated Docker image builds
- Deployment to production

## 📖 Service-Specific READMEs

Each service has its own README with detailed information:

- [services/api/README.md](services/api/README.md) - REST API documentation

## 🤝 Contributing

See individual service READMEs for specific contribution guidelines.

## 📄 License

MIT - See [LICENSE](LICENSE) file
