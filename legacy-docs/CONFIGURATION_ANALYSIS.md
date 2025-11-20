# BiteTrack Configuration Analysis & Solutions

## Current Issues Identified

### 1. **Environment File Location Mismatch**

**Problem**: The init script creates `.env.production` and `.env.development` at **project root**, but Docker Compose looks for `.env` in the **infrastructure directory**.

**Evidence**:
- `setup-env.sh` creates: `$PROJECT_ROOT/.env.production` and `$PROJECT_ROOT/.env.development`
- `docker-compose.yml` location: `infrastructure/docker-compose.yml`
- Docker Compose automatically loads: `infrastructure/.env` (same directory as docker-compose.yml)
- Current manual `.env`: `infrastructure/.env` (735 bytes, created Nov 9)

**Impact**:
- When you run `docker compose up`, it uses `infrastructure/.env` (manually created)
- Environment variables like `MCP_PORT` and `API_PORT` may not be set correctly
- Services fall back to hardcoded defaults

---

### 2. **MCP Service Port Defaulting**

**Problem**: MCP server defaults to port **4004** (recently changed from 3001), but Docker Compose maps `${MCP_PORT:-4000}:3001`.

**Code Evidence**:
```javascript
// services/mcp/index.js:10
const PORT = process.env.MCP_PORT || 4004;
```

```yaml
# infrastructure/docker-compose.yml:185
ports:
  - "${MCP_PORT:-4000}:3001"
environment:
  MCP_PORT: 3001  # <-- This is set but Docker maps external 4000 to internal 3001
```

**Current Behavior**:
- Docker starts MCP with `MCP_PORT=3001` (from environment section)
- MCP server listens on 3001 internally
- Docker maps host port 4000 → container port 3001
- **Result**: Works correctly, but confusing configuration

**Confusion Point**: The default in code (4004) is never used because Docker explicitly sets `MCP_PORT: 3001`.

---

### 3. **MongoDB Authentication Failure**

**Problem**: API can't authenticate to MongoDB despite correct credentials in `.env`.

**Evidence from logs**:
```
MongoServerError: Authentication failed.
```

**Root Cause**: The `.env` file has:
```bash
MONGO_URI='mongodb://bitetrack-admin:Mongopass123@mongodb:27017/bitetrack?authSource=admin&directConnection=true'
```

But MongoDB may not have the user created yet, OR the replica set init is using different credentials.

**Docker Compose Flow**:
1. MongoDB starts with `${MONGO_ROOT_USERNAME}` and `${MONGO_ROOT_PASSWORD}` 
2. `mongodb-init` container tries to init replica set with these credentials
3. API tries to connect with `${MONGO_URI}`

**Issue**: If replica set was initialized without authentication, or with different credentials, the current credentials won't work.

---

### 4. **Missing Symlink Strategy**

**Documentation says**: "The init script creates an .env.production file and a symlink .env"

**Reality**: 
- No symlink creation found in scripts
- `start-containers.sh` uses `--env-file` flag explicitly:
  ```bash
  docker compose --env-file "$ENV_FILE" up -d
  ```

**Problem**: If someone runs `docker compose up` without the init script, it won't use the production/development env files.

---

## Proposed Solutions

### **Solution 1: Fix Environment File Strategy (RECOMMENDED)**

Create a proper symlink system that Docker Compose understands.

**Changes needed**:

#### A. Modify `setup-env.sh` to create symlink in infrastructure directory

Add this function after line 300:

```bash
# Create symlink for Docker Compose
create_env_symlink() {
    local target_env=""
    
    if [[ "$SETUP_MODE" == "dev" ]]; then
        target_env="$PROJECT_ROOT/.env.development"
    elif [[ "$SETUP_MODE" == "prod" || "$SETUP_MODE" == "both" ]]; then
        target_env="$PROJECT_ROOT/.env.production"
    fi
    
    log_info "Creating symlink: infrastructure/.env → ${target_env}"
    
    # Remove existing .env or symlink
    rm -f "$PROJECT_ROOT/infrastructure/.env"
    
    # Create relative symlink
    cd "$PROJECT_ROOT/infrastructure"
    ln -sf "../$(basename $target_env)" .env
    cd "$PROJECT_ROOT"
    
    log_success "Symlink created: infrastructure/.env"
}
```

Call it in the main function after creating env files.

#### B. Update `start-containers.sh` to rely on symlink

Change line 66 and 72:
```bash
# FROM:
docker compose -f infrastructure/docker-compose.yml --env-file "$ENV_FILE" up -d

# TO:
docker compose -f infrastructure/docker-compose.yml up -d
```

Docker Compose will automatically use `infrastructure/.env` (the symlink).

#### C. Add .env files to project root .gitignore

```gitignore
# Environment files
.env
.env.development
.env.production
.env.local
.secrets
```

**Benefits**:
- Simple `docker compose up` works without init script
- Clear which environment is active (check symlink target)
- No `--env-file` flag needed
- Follows Docker Compose conventions

---

### **Solution 2: Fix MongoDB Authentication**

The authentication issue is likely because MongoDB wasn't initialized with the credentials properly.

**Option A: Full Reset (Recommended for Development)**

```bash
# Stop everything and clean volumes
cd infrastructure
docker compose down -v

# Verify credentials in .env
cat .env | grep MONGO

# Start fresh
docker compose up -d mongodb mongodb-init

# Wait for healthy
docker ps

# Verify replica set and create user
docker exec -it bitetrack-mongodb mongosh

# In mongosh:
use admin
db.createUser({
  user: "bitetrack-admin",
  pwd: "Mongopass123",
  roles: [
    { role: "root", db: "admin" },
    { role: "readWrite", db: "bitetrack" }
  ]
})

# Test authentication
exit
mongosh "mongodb://bitetrack-admin:Mongopass123@localhost:27017/admin"
```

**Option B: Add User Creation to Init Script**

Modify `start-containers.sh` to create MongoDB user after replica set init:

```bash
# After line 113, add:
log_info "Creating MongoDB admin user..."
docker compose -f infrastructure/docker-compose.yml exec -T mongodb mongosh --quiet --eval "
db = db.getSiblingDB('admin');
try {
    db.createUser({
        user: '$MONGO_ROOT_USERNAME',
        pwd: '$MONGO_ROOT_PASSWORD',
        roles: [
            { role: 'root', db: 'admin' },
            { role: 'readWrite', db: '$MONGO_DATABASE' }
        ]
    });
    print('[SUCCESS] User created');
} catch(e) {
    if (e.codeName === 'DuplicateKey') {
        print('[INFO] User already exists');
    } else {
        throw e;
    }
}
" || log_warning "User may already exist"
```

---

### **Solution 3: Standardize MCP Port Configuration**

**Option A: Keep Current Behavior (Simple)**

Document that MCP always uses internal port 3001, mapped to external 4000 in production.

Changes:
1. Update `services/mcp/index.js`:
```javascript
// Change line 10 from:
const PORT = process.env.MCP_PORT || 4004;

// To:
const PORT = process.env.MCP_PORT || 3001;
```

2. Document in WARP.md:
```markdown
## MCP Service Ports
- **Development**: External 4001 → Internal 3001 (npm run dev)
- **Production**: External 4000 → Internal 3001 (Docker)
- Internal port is always 3001
```

**Option B: Make It Fully Configurable**

Remove `MCP_PORT: 3001` from docker-compose.yml environment section, let it come from `.env`:

```yaml
# docker-compose.yml:185-191
ports:
  - "${MCP_PORT:-4000}:${MCP_INTERNAL_PORT:-3001}"
environment:
  MCP_PORT: ${MCP_INTERNAL_PORT:-3001}  # Internal port
  NODE_ENV: ${NODE_ENV:-production}
  # ...
```

Then in `.env`:
```bash
MCP_PORT=4000  # External host port
MCP_INTERNAL_PORT=3001  # Internal container port
```

**Recommendation**: Use Option A (simpler, less confusion).

---

### **Solution 4: Environment File Validation**

Add a validation script that checks if environment files exist and have required variables.

Create `infrastructure/scripts/validate-env.sh`:

```bash
#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Check for .env in infrastructure directory
if [ ! -f "$PROJECT_ROOT/infrastructure/.env" ]; then
    echo "ERROR: infrastructure/.env not found"
    echo "Run: npm run init"
    exit 1
fi

# Required variables
REQUIRED_VARS=(
    "MONGO_URI"
    "MONGO_ROOT_USERNAME"
    "MONGO_ROOT_PASSWORD"
    "JWT_SECRET"
    "NODE_ENV"
)

echo "Validating environment configuration..."

source "$PROJECT_ROOT/infrastructure/.env"

missing=0
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: Missing required variable: $var"
        missing=1
    else
        echo "OK: $var is set"
    fi
done

if [ $missing -eq 1 ]; then
    echo ""
    echo "Environment validation failed"
    exit 1
fi

echo ""
echo "Environment validation passed"
```

Add to `package.json`:
```json
"scripts": {
  "validate:env": "bash infrastructure/scripts/validate-env.sh",
  "docker:up": "npm run validate:env && docker compose -f infrastructure/docker-compose.yml up -d"
}
```

---

## Immediate Action Plan

### Step 1: Fix Current Broken State

```bash
cd /home/fcortesbio/projects/BiteTrack

# 1. Stop everything
docker compose -f infrastructure/docker-compose.yml down -v

# 2. Backup current .env
cp infrastructure/.env infrastructure/.env.backup

# 3. Check what we have
cat infrastructure/.env

# 4. Run init to create proper env files
npm run init
# Choose option 2 (Production)

# 5. Verify files created
ls -la .env.production infrastructure/.env

# 6. Start services
docker compose -f infrastructure/docker-compose.yml up -d

# 7. Check logs
docker compose -f infrastructure/docker-compose.yml logs -f
```

### Step 2: Implement Solution 1 (Symlink Strategy)

1. Update `setup-env.sh` with symlink function
2. Update `start-containers.sh` to remove `--env-file` flag
3. Test both dev and prod modes

### Step 3: Implement Solution 2 (MongoDB User Creation)

1. Add user creation to `start-containers.sh`
2. Test MongoDB authentication
3. Verify API can connect

### Step 4: Implement Solution 3 (MCP Port Fix)

1. Change default port in `services/mcp/index.js` to 3001
2. Update documentation

---

## Summary

**Root Causes**:
1. ✗ Environment files created at project root, but Docker looks in `infrastructure/`
2. ✗ No symlink created despite documentation claiming it
3. ✗ MongoDB user not created during initialization
4. ✗ Port confusion between defaults and actual behavior

**Fixes**:
1. ✓ Create `infrastructure/.env` symlink to `.env.production` or `.env.development`
2. ✓ Add MongoDB user creation to init script
3. ✓ Standardize MCP port to always use 3001 internally
4. ✓ Add environment validation script

**After fixes, the flow will be**:
```bash
npm run init                    # Creates .env.production + symlink
docker compose up -d            # Uses infrastructure/.env (symlink)
# All services start with correct environment variables
```
