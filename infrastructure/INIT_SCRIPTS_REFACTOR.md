# Init Scripts Monorepo Refactoring

## Objective
Refactor initialization scripts to properly support BiteTrack's monorepo structure with unified environment management.

## Current Issues
- Init scripts located in `services/api/scripts/` assume single-app structure
- Scripts expect `docker-compose.yml` in current directory
- No support for dual dev/production environments with shared MongoDB
- Port configuration hardcoded
- Missing GenAI API key configuration

## Target Architecture

### Directory Structure
```
BiteTrack/
├── infrastructure/
│   ├── scripts/
│   │   ├── init.sh                    # Main entry point
│   │   ├── init-interactive.sh        # Interactive setup
│   │   ├── init-noninteractive.sh     # Automated setup
│   │   ├── setup-mongodb.sh           # MongoDB initialization
│   │   ├── setup-env.sh               # Environment file generation
│   │   └── create-superadmin.sh       # User creation
│   └── docker-compose.yml
├── .env.development                    # Dev environment config
├── .env.production                     # Production environment config
└── package.json                        # Root scripts: npm run init, npm run dev
```

### Environment Configuration

#### Development (.env.development)
```bash
# MongoDB (shared with production)
MONGO_URI=mongodb://bitetrack-admin:PASSWORD@localhost:27017/bitetrack?authSource=bitetrack
MONGO_ROOT_USERNAME=bitetrack-admin
MONGO_ROOT_PASSWORD=PASSWORD

# API Server
API_PORT=3001
API_URL=http://localhost:3001

# MCP Server  
MCP_PORT=4001
MCP_URL=http://localhost:4001

# Frontend
FRONTEND_PORT=5001
FRONTEND_URL=http://localhost:5001

# GenAI
GENAI_API_KEY=your-key-here

# JWT
JWT_SECRET=auto-generated
JWT_EXPIRATION=7d

NODE_ENV=development
```

#### Production (.env.production)
```bash
# Same structure but with production ports:
API_PORT=3000
MCP_PORT=4000  
FRONTEND_PORT=5000
NODE_ENV=production
```

## Implementation Plan

### Phase 1: Script Migration
- [ ] Copy relevant scripts from `services/api/scripts/` to `infrastructure/scripts/`
- [ ] Update script paths to work from repository root
- [ ] Remove hardcoded paths and make them configurable

### Phase 2: Environment Management
- [ ] Create `setup-env.sh` for generating `.env.development` and `.env.production`
- [ ] Add interactive prompts for:
  - MongoDB password
  - GenAI API key
  - Port configuration (with defaults)
  - Environment type (dev/production/both)
- [ ] Generate JWT secrets automatically

### Phase 3: MongoDB Setup
- [ ] Fix docker-compose.yml port mapping issue
- [ ] Ensure MongoDB exposes port 27017 to localhost
- [ ] Create database and users for both environments
- [ ] Initialize replica set if needed

### Phase 4: NPM Scripts Integration
- [ ] Add `npm run init` to root package.json:
  ```json
  "init": "bash infrastructure/scripts/init.sh",
  "init:dev": "bash infrastructure/scripts/init.sh --env development",
  "init:prod": "bash infrastructure/scripts/init.sh --env production"
  ```
- [ ] Update `npm run dev` in workspaces to check:
  - `.env.development` exists
  - MongoDB is running on port 27017
  - Provide helpful error messages if not

### Phase 5: Docker Compose Fix
- [ ] Investigate why port mapping isn't working with custom entrypoint
- [ ] Consider simplified MongoDB setup without replica set for dev
- [ ] Ensure single MongoDB instance serves both dev and production

### Phase 6: SuperAdmin Creation
- [ ] Update `create-superadmin.sh` for ESM compatibility
- [ ] Support both interactive and non-interactive modes
- [ ] Properly hash passwords using bcryptjs

### Phase 7: Documentation & Testing
- [ ] Update README.md with new initialization process
- [ ] Create CONTRIBUTING.md with development setup guide
- [ ] Test full flow: clean install → init → dev → production
- [ ] Document troubleshooting steps

## User Experience

### Quick Start (Interactive)
```bash
npm run init
# Prompts for MongoDB password, GenAI key, ports, environment type
# Generates .env files, starts MongoDB, creates superadmin
```

### Automated Setup (CI/CD)
```bash
infrastructure/scripts/init-noninteractive.sh \
  --env both \
  --mongo-password "$MONGO_PASS" \
  --genai-key "$GENAI_KEY" \
  --admin-email "admin@example.com" \
  --admin-password "$ADMIN_PASS"
```

### Development Workflow
```bash
npm run dev          # Auto-checks prerequisites, starts all services
npm run dev:api      # Start only API (port 3001)
npm run dev:mcp      # Start only MCP (port 4001)
npm run dev:frontend # Start only frontend (port 5001)
```

## Success Criteria
- ✅ Single `npm run init` command sets up entire stack
- ✅ Support for both dev and production environments
- ✅ Shared MongoDB instance accessible at localhost:27017
- ✅ Clear error messages when prerequisites missing
- ✅ Works on clean machine with just Docker and Node installed
- ✅ All existing functionality preserved

## Breaking Changes
- Init scripts moved from `services/api/scripts/` to `infrastructure/scripts/`
- Environment files moved to repository root
- Port defaults changed for dev environment

## Migration Guide
For existing installations:
1. Run `npm run init` to regenerate environment files
2. Update any custom scripts referencing old paths
3. Restart services to pick up new ports
