# NPM Workspaces Quick Reference

## What are NPM Workspaces?

NPM Workspaces let you manage multiple packages (services) in a single repository. Think of it as having multiple `package.json` files that share dependencies and can reference each other.

## Key Benefits

1. **Single `node_modules`** - All services share dependencies (saves disk space)
2. **Automatic linking** - Local packages reference each other without `npm link`
3. **Unified commands** - Run scripts across all services at once
4. **Version consistency** - Ensure same library versions across services

## Essential Commands

### Installation

```bash
# Install all workspaces (run from repo root)
npm install

# Install dependency to specific workspace
npm install express -w services/api
npm install react -w services/frontend

# Install dev dependency
npm install -D jest -w services/api
```

### Running Scripts

```bash
# Run script in ALL workspaces (if they have it)
npm run test
npm run dev
npm run build
npm run lint

# Run script in SPECIFIC workspace
npm run test -w services/api
npm run dev -w services/frontend
npm run build -w services/mcp

# Run script in MULTIPLE workspaces
npm run test -w services/api -w services/frontend
```

### Workspace Information

```bash
# List all workspaces
npm list --workspaces --depth=0

# Show workspace tree
npm ls --all

# Check specific workspace
npm list -w services/api
```

### Cleaning

```bash
# Remove all node_modules (root + all workspaces)
npm run clean

# Or manually
rm -rf node_modules services/*/node_modules packages/*/node_modules

# Reinstall everything
npm install
```

## Current Workspace Structure

```
BiteTrack/
 package.json # Root workspace config
 services/
    api/
        package.json # Workspace: bitetrack
 packages/
     shared-types/
         package.json # Workspace: @bitetrack/shared-types
```

## Referencing Shared Packages

To use `@bitetrack/shared-types` in any service:

**1. Add to service's `package.json`:**
```json
{
  "dependencies": {
    "@bitetrack/shared-types": "*"
  }
}
```

**2. Run `npm install` from root**

**3. Import in your code:**
```javascript
import { USER_ROLES, PAYMENT_STATUS } from '@bitetrack/shared-types';
```

NPM Workspaces automatically links local packages - no manual linking needed!

## Adding New Services

### Step 1: Create directory
```bash
mkdir -p services/new-service
cd services/new-service
```

### Step 2: Initialize package.json
```bash
npm init -y
```

Edit `package.json`:
```json
{
  "name": "@bitetrack/new-service",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "test": "jest"
  }
}
```

### Step 3: Install from root
```bash
cd /home/fcortesbio/projects/BiteTrack
npm install
```

The new service is now part of the workspace!

### Step 4: Add dependencies
```bash
npm install express -w services/new-service
npm install @bitetrack/shared-types -w services/new-service
```

## Docker with Workspaces

Dockerfiles need to be workspace-aware:

```dockerfile
# Copy root package.json first
COPY package.json ./

# Copy workspace-specific files
COPY services/my-service/package*.json ./services/my-service/

# Copy shared packages
COPY packages ./packages/

# Install (workspace aware)
RUN npm install --workspace=services/my-service

# Copy source code
COPY services/my-service ./services/my-service/

# Set working directory
WORKDIR /app/services/my-service
```

## Troubleshooting

### Problem: "Cannot find module '@bitetrack/shared-types'"

**Solution:**
```bash
# From root
npm install
```

### Problem: Changes to shared-types not reflected

**Solution:** Restart your dev server (no rebuild needed for local packages)

### Problem: Different versions of same package in workspaces

**Solution:** Check root `package.json` doesn't conflict with workspace versions. Prefer installing shared dependencies at workspace level, not root.

### Problem: npm install fails

**Solution:**
```bash
# Clean everything
npm run clean
rm -f package-lock.json services/*/package-lock.json

# Reinstall
npm install
```

## Learn More

- [Official NPM Workspaces Docs](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
- [BiteTrack Monorepo README](README.monorepo.md)

## Pro Tips

1. **Always run `npm install` from root** - it handles all workspaces
2. **Use `-w` flag** for workspace-specific commands
3. **Shared packages update automatically** - no rebuild needed
4. **Keep root package.json minimal** - dependencies go in workspaces
5. **Use `--if-present`** in root scripts - services without script won't error

Example root script:
```json
{
  "scripts": {
    "test": "npm run test --workspaces --if-present"
  }
}
```

This runs tests in all workspaces that have a `test` script, skipping others.
