# Health Check Fixes

**Date:** 2025-11-12
**Status:** RESOLVED

## Problem Summary

Both Traefik and Frontend containers were showing as unhealthy despite running correctly.

## Root Causes Identified

### 1. **Traefik Health Check** (Line 43)

**Issue:** The health check command `traefik healthcheck --ping` was failing with `404 Not Found`.

**Root Cause:** The `--ping` endpoint was not enabled in Traefik's configuration.

**Error Output:**

```
Bad healthcheck status: 404 Not Found
```

**Solution:** Added `--ping=true` to Traefik's command configuration.

```yaml
command:
  - "--ping=true" # Enable ping endpoint for health checks
```

### 2. **Frontend Health Check** (Line 148)

**Issue:** The health check was failing with `Connection refused` despite nginx running properly.

**Root Cause:** The health check used `http://localhost/health`, which resolved to IPv6 `[::1]:80`, but nginx was only listening on IPv4 `0.0.0.0:80`.

**Error Output:**

```
Connecting to localhost ([::1]:80)
wget: can't connect to remote host: Connection refused
```

**Solution:** Changed `localhost` to `127.0.0.1` to force IPv4 connection.

```yaml
healthcheck:
  test:
    [
      "CMD",
      "wget",
      "--no-verbose",
      "--tries=1",
      "--spider",
      "http://127.0.0.1/health",
    ]
```

## Changes Made

### docker-compose.yml

**Before:**

```yaml
# Traefik
command:
  - "--api.dashboard=true"
  - "--api.insecure=true"
  - "--providers.docker=true"
  - "--providers.docker.exposedbydefault=false"
  - "--entrypoints.web.address=:80"
  - "--entrypoints.traefik.address=:8080"
  - "--log.level=DEBUG"

# Frontend
healthcheck:
  test:
    [
      "CMD",
      "wget",
      "--no-verbose",
      "--tries=1",
      "--spider",
      "http://localhost/health",
    ]
```

**After:**

```yaml
# Traefik
command:
  - "--api.dashboard=true"
  - "--api.insecure=true"
  - "--providers.docker=true"
  - "--providers.docker.exposedbydefault=false"
  - "--entrypoints.web.address=:80"
  - "--entrypoints.traefik.address=:8080"
  - "--ping=true" # ← ADDED
  - "--log.level=DEBUG"

# Frontend
healthcheck:
  test: [
      "CMD",
      "wget",
      "--no-verbose",
      "--tries=1",
      "--spider",
      "http://127.0.0.1/health",
    ] # ← CHANGED
```

## Verification

### Health Check Status After Fix

```bash
$ docker compose ps
NAME STATUS
bitetrack-api Up 2 days (healthy)
bitetrack-frontend Up 21 seconds (healthy)
bitetrack-mcp Up 2 days (healthy)
bitetrack-mongodb Up 2 days (healthy)
bitetrack-traefik Up 21 seconds (healthy)
```

### Health Check Logs

**Traefik:**

```json
{
  "ExitCode": 0,
  "Output": "OK: http://:8080/ping\n"
}
```

**Frontend:**

```json
{
  "ExitCode": 0,
  "Output": "Connecting to 127.0.0.1 (127.0.0.1:80)\nremote file exists\n"
}
```

## Technical Details

### Why localhost vs 127.0.0.1 Matters

In Alpine Linux containers (which both nginx and Traefik use):

- `localhost` can resolve to both IPv4 (127.0.0.1) and IPv6 (::1)
- `wget` prefers IPv6 when available
- If the service only binds to IPv4 (0.0.0.0:80), IPv6 connections fail

**Solution:** Use explicit `127.0.0.1` to force IPv4 connection.

### Traefik Ping Endpoint

The `--ping` flag enables a dedicated health check endpoint at:

- `http://localhost:8080/ping` (when using traefik entrypoint)
- Returns `OK` when Traefik is healthy

This is the recommended way to health check Traefik rather than checking the dashboard or API endpoints.

## Best Practices Applied

1. Use explicit IP addresses (127.0.0.1) instead of hostname (localhost) for health checks
2. Enable dedicated health check endpoints (--ping for Traefik)
3. Set appropriate intervals and timeouts for health checks
4. Use start_period to allow services time to initialize

## All Health Checks Now Passing

| Service            | Health Check Command                          | Status  |
| ------------------ | --------------------------------------------- | ------- |
| bitetrack-api      | `wget http://localhost:3000/bitetrack/health` | Healthy |
| bitetrack-frontend | `wget http://127.0.0.1/health`                | Healthy |
| bitetrack-mcp      | `wget http://localhost:3001/health`           | Healthy |
| bitetrack-mongodb  | `mongosh --eval "db.adminCommand('ping')"`    | Healthy |
| bitetrack-traefik  | `traefik healthcheck --ping`                  | Healthy |

## Commands to Apply Changes

```bash
# Recreate containers with fixed configuration
cd /home/fcortesbio/projects/BiteTrack/infrastructure
docker compose up -d --force-recreate traefik bitetrack-frontend

# Wait for health checks to complete (10-30 seconds)
sleep 15

# Verify all services are healthy
docker compose ps
```

## Status: RESOLVED

All containers are now running and healthy!
