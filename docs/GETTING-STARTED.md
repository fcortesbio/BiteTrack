# 🚀 Getting Started with BiteTrack

## ✨ What's New

Your BiteTrack project now has a **complete multi-service architecture** with:

- ✅ **Frontend** - React + Vite boilerplate (ready for development)
- ✅ **API** - Your existing Express REST API (refactored for independence)
- ✅ **MCP** - AI server boilerplate (ready for Gemini integration)
- ✅ **MongoDB** - Database with replica set
- ✅ **Traefik** - Reverse proxy routing all services

Everything is orchestrated with Docker Compose and accessible through **one domain** (localhost or your production domain).

---

## 🎯 Quick Start (3 Steps)

### 1. **One-Command Setup**

```bash
cd infrastructure
./scripts/init.sh
```

This automated script will:

- ✅ Check Docker prerequisites
- ✅ Generate secure secrets (JWT, MongoDB password)
- ✅ Build all service images
- ✅ Initialize MongoDB replica set
- ✅ Start all 5 services
- ✅ Run health checks

**Total time: ~5-10 minutes** (depending on your machine)

### 2. **Access Your Services**

Open your browser and visit:

| Service               | URL                                 | What You'll See                           |
| --------------------- | ----------------------------------- | ----------------------------------------- |
| **Frontend**          | http://localhost                    | Beautiful landing page with system status |
| **API**               | http://localhost/bitetrack/health   | API health check                          |
| **API Docs**          | http://localhost/bitetrack/api-docs | Interactive Swagger UI                    |
| **MCP**               | http://localhost/mcp                | AI server info                            |
| **Traefik Dashboard** | http://localhost:8080               | Service routing overview                  |

### 3. **Test Traefik Routing**

All services are accessible through **one port (80)**:

```bash
# Frontend
curl http://localhost/

# API
curl http://localhost/bitetrack/health

# MCP
curl http://localhost/mcp/health
```

Traefik automatically routes requests to the right service! 🎉

---

## 📁 Project Structure (After Setup)

```
BiteTrack/
├── services/
│   ├── api/                       # ✅ Your existing API
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── Dockerfile             # Standalone, no workspace deps
│   │   └── package.json
│   │
│   ├── frontend/                  # 🆕 React boilerplate
│   │   ├── src/
│   │   │   ├── App.jsx           # Landing page with status checks
│   │   │   └── ...
│   │   ├── Dockerfile             # Multi-stage (build + nginx)
│   │   └── package.json
│   │
│   └── mcp/                       # 🆕 AI server boilerplate
│       ├── index.js               # Express server with health endpoint
│       ├── Dockerfile
│       └── package.json
│
├── infrastructure/
│   ├── docker-compose.yml         # 🆕 Unified orchestration (all services)
│   ├── traefik/
│   │   └── traefik.yml            # 🆕 Reverse proxy config
│   └── scripts/
│       └── init.sh                # 🆕 Automated setup script
│
├── .env                           # 🆕 Global configuration (created by init.sh)
└── .env.example                   # 🆕 Template with documentation
```

---

## 🌐 How Traefik Routing Works

Traefik acts as a **smart reverse proxy** that automatically routes traffic:

```
User Request → Traefik (Port 80) → Right Service

Examples:
  http://localhost/           → Frontend (React)
  http://localhost/api/...    → API (Express)
  http://localhost/bitetrack/ → API (Express)
  http://localhost/mcp/...    → MCP (AI server)
```

**Why this is awesome:**

- ✅ One domain for everything
- ✅ No port management (3000, 3001, etc.)
- ✅ Easy SSL/HTTPS setup (just uncomment config)
- ✅ Automatic service discovery
- ✅ Built-in load balancing

---

## 🔧 Development Workflow

### **Option A: Docker Development** (Recommended for testing full stack)

```bash
cd infrastructure

# Start everything
docker compose up -d

# View logs
docker compose logs -f bitetrack-api     # API logs
docker compose logs -f bitetrack-frontend # Frontend logs
docker compose logs -f bitetrack-mcp      # MCP logs

# Rebuild after code changes
docker compose build bitetrack-api
docker compose restart bitetrack-api

# Stop everything
docker compose down
```

### **Option B: Local Development** (Faster for rapid iteration)

**Terminal 1 - API:**

```bash
cd services/api
npm install
npm run dev  # Port 3000
```

**Terminal 2 - Frontend:**

```bash
cd services/frontend
npm install
npm run dev  # Port 5173
```

**Terminal 3 - MCP:**

```bash
cd services/mcp
npm install
npm run dev  # Port 3001
```

Then access directly:

- Frontend: http://localhost:5173
- API: http://localhost:3000
- MCP: http://localhost:3001

---

## 📝 Common Commands

### Service Management

```bash
# Start all services
cd infrastructure && docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart bitetrack-frontend

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f bitetrack-api
```

### Development

```bash
# Rebuild after code changes
docker compose build bitetrack-api
docker compose up -d bitetrack-api

# Rebuild everything
docker compose build --parallel

# Clean restart
docker compose down -v
docker compose up -d --build
```

### Database

```bash
# Connect to MongoDB
docker compose exec mongodb mongosh -u admin -p

# Check replica set
docker compose exec mongodb mongosh --eval "rs.status()"
```

---

## 🎨 Next Steps

### **For Frontend Development:**

1. Open `services/frontend/src/App.jsx`
2. Start building your dashboard
3. API calls work automatically via Traefik: `fetch('/api/...')`
4. Hot reload enabled (`npm run dev`)

### **For MCP Integration:**

1. Open `services/mcp/index.js`
2. Add Gemini API integration
3. Implement MCP protocol
4. Create tool definitions for BiteTrack API

### **For CI/CD:**

1. Create `.github/workflows/ci.yml`
2. Test all services
3. Build Docker images
4. Deploy to production

---

## 🐛 Troubleshooting

### **Services won't start**

```bash
# Check Docker is running
docker ps

# View error logs
cd infrastructure
docker compose logs

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### **Can't access frontend/API**

```bash
# Verify Traefik is running
docker compose ps traefik

# Check Traefik dashboard
open http://localhost:8080

# Check service health
curl http://localhost/bitetrack/health
```

### **MongoDB connection issues**

```bash
# Check MongoDB is healthy
docker compose ps mongodb

# Reinitialize replica set
docker compose exec mongodb mongosh --eval "rs.initiate()"
```

---

## 📚 Documentation

- **Infrastructure**: `infrastructure/README.md` - Complete Docker guide
- **Frontend**: `services/frontend/README.md` - React development guide
- **MCP**: `services/mcp/README.md` - AI server implementation guide
- **API**: `services/api/README.md` - API documentation
- **Workspaces**: `WORKSPACES.md` - NPM workspace usage

---

## 🎉 You're All Set!

Your BiteTrack infrastructure is **production-ready** with:

- ✅ Service independence (each has own Dockerfile)
- ✅ Network isolation (MongoDB not exposed externally)
- ✅ Automatic routing (Traefik)
- ✅ Health checks (all services)
- ✅ Secure secrets (generated automatically)
- ✅ Development + Production configs

**Start developing:**

```bash
cd infrastructure
./scripts/init.sh
# Wait 5-10 minutes
# Open http://localhost
# 🚀 You're running!
```

Questions? Check the READMEs in each service directory or the infrastructure folder.

---

**Happy coding! 🍔✨**
