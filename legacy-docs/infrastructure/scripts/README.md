# BiteTrack Infrastructure Initialization Scripts

This directory contains the monorepo initialization scripts for BiteTrack. These scripts replace the previous `services/api/scripts` initialization system with a unified, global approach that supports both development and production environments.

## Overview

The init scripts provide a comprehensive setup system that:

- Generates environment configuration files at project root
- Sets up MongoDB with replica set authentication
- Creates SuperAdmin users
- Manages Docker containers
- Supports both development and production workflows
- Validates environment prerequisites before running

## Quick Start

From the project root:

```bash
# Interactive setup (recommended)
npm run init

# Docker management
npm run docker:up       # Start all services
npm run docker:down     # Stop all services
npm run docker:logs     # View logs
npm run docker:clean    # Complete cleanup

# Development workflow
npm run dev             # Starts all services with pre-checks
```

## Scripts

### `init.sh`

Main entry point for the initialization system.

**Usage:**

```bash
npm run init
# or
bash infrastructure/scripts/init.sh
```

**Features:**

- Interactive menu for setup mode selection
- Docker cleanup options (BiteTrack only, complete, or skip)
- Prerequisites validation (Docker, Node.js, Python, bcrypt, etc.)
- Orchestrates all other setup scripts

**Setup Modes:**

1. **Development environment only** - Generates `.env.development`, starts MongoDB only (for local development)
2. **Production environment only** - Generates `.env.production`, starts **full Docker stack**
3. **Both development and production** - Generates both `.env` files, starts **full Docker stack** (you can switch to dev mode later)
4. **Quick start** - Uses existing environment files, starts MongoDB only

**Important Note:**

- **Mode 1 (Dev)**: MongoDB only - services run locally via `npm run dev`
- **Modes 2 & 3 (Prod/Both)**: Full Docker stack - all services accessible via Traefik
- **Mode 3** gives you the flexibility to switch between production (currently running) and development (stop Docker, run `npm run dev`)

### `setup-env.sh`

Generates `.env.development` and/or `.env.production` files at project root.

**Configuration Prompts:**

- MongoDB credentials (username, password, database name)
- JWT configuration (auto-generates secure secret)
- Gemini API key (optional, for MCP AI features)
- Port configuration (separate for dev/prod)
- CORS/Frontend URLs

**Generated Files:**

- `.env.development` - For local development (services run outside Docker)
- `.env.production` - For production deployment (services run in Docker)
- `.secrets` - Secure credentials file (600 permissions, added to .gitignore)

### `setup-keyfile.sh`

Sets up MongoDB replica set keyfile for authentication.

**Behavior:**

- Checks for existing `keyfile` at project root
- Copies from `keyfile.example` if available
- Generates new 1024-character base64 key if needed
- Sets proper permissions (600)

### `start-containers.sh`

Starts Docker containers and initializes MongoDB replica set.

**Process:**

1. Determines which environment file to use based on `SETUP_MODE`
2. **Production mode**: Starts full Docker stack (`docker compose up -d`)
3. **Dev/Both modes**: Starts MongoDB only (`docker compose up -d mongodb`)
4. Waits for MongoDB health check (30 attempts, 2s intervals)
5. Initializes replica set `rs0`
6. Waits for replica set stabilization
7. **Production mode**: Shows container status and access points

**Behavior by Mode:**

- **Dev mode**: Starts MongoDB only (services run locally via `npm run dev`)
- **Prod mode**: Starts full stack (API, MCP, Frontend, Traefik, MongoDB)
- **Both mode**: Starts full stack (production running, but dev config also available for later)

### `create-superadmin.sh`

Creates initial SuperAdmin user in MongoDB.

**Features:**

- Interactive prompts for user details
- Input validation (name, email, date, password complexity)
- Password hashing using Python bcrypt (12 rounds)
- Duplicate email checking
- Appends credentials to `.secrets` file

**Requirements:**

- MongoDB container must be running and healthy
- Python with bcrypt module installed

### `quick-start.sh`

Quick restart script for existing environments (mode 4 in init menu).

**Features:**

- Uses existing `.env.development` and/or `.env.production` files
- No reconfiguration needed - just starts services
- Auto-detects which environment files exist
- If both exist, prompts user to choose
- Ensures MongoDB replica set is initialized

**Behavior:**

- **Dev environment only**: Starts MongoDB only
- **Prod environment only**: Starts full Docker stack
- **Both environments exist**: Prompts user to choose which to start

**Use Cases:**

- Restart after `docker compose down`
- Switch between environments quickly
- Skip full setup when environment is already configured

### `check-dev-env.sh`

Pre-flight validation for `npm run dev` command.

**Checks:**

1. `.env.development` file exists at project root
2. MongoDB is accessible on `localhost:27017`

**Integration:**

- Automatically runs before `npm run dev` via `predev` script
- Provides helpful error messages with resolution steps

## Environment Files

### Development (.env.development)

Located at: `<project_root>/.env.development`

**Key Features:**

- `NODE_ENV=development`
- MongoDB connects to `localhost:27017` (for services outside Docker)
- Debug logging enabled
- Default ports: API 3001, MCP 4001, Frontend 5001

### Production (.env.production)

Located at: `<project_root>/.env.production`

**Key Features:**

- `NODE_ENV=production`
- MongoDB connects to `mongodb:27017` (Docker service name)
- Production logging
- Default ports: API 3000, MCP 4000, Frontend 5000

### Secrets File (.secrets)

Located at: `<project_root>/.secrets`

**Contains:**

- MongoDB credentials
- JWT secret
- Gemini API key (if provided)
- SuperAdmin credentials
- Port configuration

**Security:**

- File permissions: 600 (owner read/write only)
- Should be in .gitignore (DO NOT commit)

## Port Configuration

### Production (Docker)

- API: 3000
- MCP: 4000
- Frontend: 5000
- MongoDB: 27017

### Development (Local)

- API: 3001
- MCP: 4001
- Frontend: 5001
- MongoDB: 27017 (shared)

## Prerequisites

Before running init scripts, ensure you have:

- Docker & Docker Compose
- Node.js >= 18.0.0
- Python 3 with bcrypt module (`pip3 install bcrypt`)
- OpenSSL
- curl
- jq

## Workflow Examples

### First-Time Setup (Development)

```bash
# Clone repository
git clone <repo-url>
cd BiteTrack

# Install dependencies
npm install

# Initialize development environment
npm run init
# Select: "1. Full setup - Development environment"

# Start development
npm run dev
```

### First-Time Setup (Production)

```bash
# Initialize production environment
npm run init
# Select: "2. Full setup - Production environment"

# Start production stack
docker compose up -d

# Check health
curl http://localhost:3000/bitetrack/health
```

### Add Development Environment to Existing Production Setup

```bash
# Run init again
npm run init
# Select: "1. Full setup - Development environment"

# MongoDB is already running from production
# Dev services will connect to existing MongoDB
npm run dev
```

## Troubleshooting

### MongoDB Connection Issues

**Problem:** Can't connect to MongoDB

**Solutions:**

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Start MongoDB only
docker compose up -d mongodb

# Check MongoDB logs
docker compose logs mongodb

# Verify port is exposed
nc -z localhost 27017
```

### Environment File Issues

**Problem:** `.env.development` not found

**Solution:**

```bash
# Run initialization
npm run init
```

### Permission Issues with Keyfile

**Problem:** MongoDB complains about keyfile permissions

**Solution:**

```bash
# Keyfile should have 600 permissions
chmod 600 keyfile
```

### SuperAdmin Creation Fails

**Problem:** User creation fails or user already exists

**Solutions:**

```bash
# Check existing users
docker compose exec mongodb mongosh \
  -u <username> -p <password> \
  --authenticationDatabase admin bitetrack \
  --eval "db.sellers.find({role: 'superadmin'})"

# If user exists, you can use existing credentials
# Or delete and recreate:
docker compose exec mongodb mongosh \
  -u <username> -p <password> \
  --authenticationDatabase admin bitetrack \
  --eval "db.sellers.deleteOne({email: 'admin@example.com'})"
```

### Python bcrypt Not Found

**Problem:** `ModuleNotFoundError: No module named 'bcrypt'`

**Solutions:**

```bash
# Install bcrypt
pip3 install bcrypt

# Or system package (Arch Linux)
sudo pacman -S python-bcrypt

# Or system package (Debian/Ubuntu)
sudo apt-get install python3-bcrypt
```

## Migration from Old Scripts

The previous initialization scripts were located at `services/api/scripts/`. These have been replaced by the infrastructure-level scripts.

**Key Differences:**

| Old                                                | New                                |
| -------------------------------------------------- | ---------------------------------- |
| `services/api/scripts/00-init-production-setup.sh` | `infrastructure/scripts/init.sh`   |
| `.env.production` in API directory                 | `.env.production` at root          |
| `.env.development` in API directory                | `.env.development` at root         |
| API-centric                                        | Monorepo-wide (API, MCP, Frontend) |
| Manual Docker commands                             | Integrated with npm scripts        |

**Migration Steps:**

1. Run `npm run init` from project root
2. Select appropriate environment mode
3. Old .env files can be removed
4. New files are at project root

## Architecture

```
BiteTrack/
├── .env.development      # Generated by setup-env.sh
├── .env.production       # Generated by setup-env.sh
├── .secrets              # Generated by setup-env.sh
├── keyfile               # Generated by setup-keyfile.sh
├── docker-compose.yml    # Reads root .env files
├── infrastructure/
│   └── scripts/
│       ├── init.sh                 # Main entry point
│       ├── setup-env.sh            # Environment generation
│       ├── setup-keyfile.sh        # MongoDB keyfile setup
│       ├── start-containers.sh     # Docker startup
│       ├── create-superadmin.sh    # User creation
│       ├── check-dev-env.sh        # Dev pre-checks
│       └── README.md               # This file
└── services/
    ├── api/
    ├── mcp/
    └── frontend/
```

## Security Considerations

1. **Never commit `.secrets` file** - Contains plaintext credentials
2. **MongoDB passwords** - Use strong passwords (8+ chars, mixed case, digits)
3. **JWT secrets** - Auto-generated 256-bit secrets
4. **Keyfile** - Generated with proper entropy, 600 permissions
5. **File permissions** - All sensitive files have 600 permissions

## Contributing

When adding new environment variables:

1. Update `setup-env.sh` to prompt for the value
2. Add to both `.env.development` and `.env.production` templates
3. Add to `.secrets` file if sensitive
4. Update this README with documentation

## Support

For issues or questions:

- Check the troubleshooting section above
- Review the main project README
- Check existing GitHub issues
- Create a new issue with detailed error logs
