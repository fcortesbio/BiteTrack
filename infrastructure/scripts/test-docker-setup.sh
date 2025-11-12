#!/bin/bash
# BiteTrack Docker Compose Test Script
# Tests all services, networking, and health checks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}BiteTrack Docker Compose Test Suite${NC}"
echo "======================================"
echo ""

# Change to infrastructure directory
cd "$(dirname "$0")/.."

# Check if .env file exists
echo -e "${BLUE}[1/10] Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found in infrastructure directory${NC}"
    echo "Run: cp ../.env.production .env"
    exit 1
fi
echo -e "${GREEN}Environment file found${NC}"
echo ""

# Stop any running containers
echo -e "${BLUE}[2/10] Cleaning up existing containers...${NC}"
docker compose down -v 2>/dev/null || true
# Remove any lingering containers with bitetrack prefix
docker ps -a --filter "name=bitetrack" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
echo -e "${GREEN}Cleanup complete${NC}"
echo ""

# Build images
echo -e "${BLUE}[3/10] Building Docker images...${NC}"
if docker compose build --no-cache; then
    echo -e "${GREEN}All images built successfully${NC}"
else
    echo -e "${RED}ERROR: Failed to build images${NC}"
    exit 1
fi
echo ""

# Start services
echo -e "${BLUE}[4/10] Starting all services...${NC}"
if docker compose up -d; then
    echo -e "${GREEN}Services started${NC}"
else
    echo -e "${RED}ERROR: Failed to start services${NC}"
    exit 1
fi
echo ""

# Wait for services to be healthy
echo -e "${BLUE}[5/10] Waiting for services to be healthy (max 120s)...${NC}"
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTH_STATUS=$(docker compose ps --format json | jq -r '.[].Health' 2>/dev/null || echo "")
    
    # Count services
    TOTAL=$(docker compose ps --format json | jq -s 'length' 2>/dev/null || echo 0)
    HEALTHY=$(echo "$HEALTH_STATUS" | grep -c "healthy" || echo 0)
    
    echo -ne "\r  Healthy: $HEALTHY/$TOTAL services (${ELAPSED}s elapsed)   "
    
    # Check if all services are healthy (excluding init container)
    if [ "$HEALTHY" -ge 4 ]; then
        echo ""
        echo -e "${GREEN}All services are healthy!${NC}"
        break
    fi
    
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo ""
    echo -e "${YELLOW}WARNING: Timeout reached, checking service status...${NC}"
    docker compose ps
fi
echo ""

# Test Traefik
echo -e "${BLUE}[6/10] Testing Traefik reverse proxy...${NC}"
if curl -sf http://localhost:8080/api/overview >/dev/null; then
    echo -e "${GREEN}Traefik dashboard accessible${NC}"
else
    echo -e "${YELLOW}WARNING: Traefik dashboard not accessible${NC}"
fi
echo ""

# Test MongoDB
echo -e "${BLUE}[7/10] Testing MongoDB connection...${NC}"
if docker exec bitetrack-mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo -e "${GREEN}MongoDB is responding${NC}"
    
    # Check replica set status
    RS_STATUS=$(docker exec bitetrack-mongodb mongosh --quiet --eval "rs.status().ok" 2>/dev/null || echo "0")
    if [ "$RS_STATUS" = "1" ]; then
        echo -e "${GREEN}Replica set initialized${NC}"
    else
        echo -e "${YELLOW}WARNING: Replica set not ready${NC}"
    fi
else
    echo -e "${RED}ERROR: MongoDB connection failed${NC}"
fi
echo ""

# Test API
echo -e "${BLUE}[8/10] Testing BiteTrack API...${NC}"
sleep 5  # Give API time to connect to MongoDB
API_HEALTH=$(curl -sf http://localhost/bitetrack/health 2>/dev/null || echo "")
if [ -n "$API_HEALTH" ]; then
    echo -e "${GREEN}API health endpoint responding${NC}"
    echo "  Response: $API_HEALTH"
else
    echo -e "${RED}ERROR: API not responding${NC}"
    echo "  Checking logs:"
    docker logs bitetrack-api --tail 20
fi
echo ""

# Test Frontend
echo -e "${BLUE}[9/10] Testing Frontend...${NC}"
if curl -sf http://localhost/ >/dev/null; then
    echo -e "${GREEN}Frontend is accessible${NC}"
else
    echo -e "${YELLOW}WARNING: Frontend not accessible${NC}"
fi
echo ""

# Test MCP
echo -e "${BLUE}[10/10] Testing MCP service...${NC}"
MCP_HEALTH=$(curl -sf http://localhost/mcp/health 2>/dev/null || echo "")
if [ -n "$MCP_HEALTH" ]; then
    echo -e "${GREEN}MCP service responding${NC}"
    echo "  Response: $MCP_HEALTH"
else
    echo -e "${YELLOW}WARNING: MCP not responding (this may be expected if not fully configured)${NC}"
fi
echo ""

# Display container status
echo -e "${BLUE}Container Status Summary:${NC}"
docker compose ps
echo ""

# Display network info
echo -e "${BLUE}Network Configuration:${NC}"
docker network ls | grep bitetrack
echo ""

# Quick routing test
echo -e "${BLUE}Routing Tests:${NC}"
echo "  Frontend (/):"
curl -sI http://localhost/ | grep -E "HTTP|Server" | head -2
echo ""
echo "  API (/bitetrack/health):"
curl -sI http://localhost/bitetrack/health | grep -E "HTTP|Content-Type" | head -2
echo ""
echo "  MCP (/mcp/health):"
curl -sI http://localhost/mcp/health | grep -E "HTTP|Content-Type" | head -2 || echo "    Not responding"
echo ""

# Final summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Suite Complete!${NC}"
echo ""
echo -e "${BLUE}Access points:${NC}"
echo "  Frontend:  http://localhost"
echo "  API:       http://localhost/bitetrack/health"
echo "  MCP:       http://localhost/mcp/health"
echo "  Traefik:   http://localhost:8080"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs:     docker compose -f infrastructure/docker-compose.yml logs -f"
echo "  Stop all:      docker compose -f infrastructure/docker-compose.yml down"
echo "  Restart:       docker compose -f infrastructure/docker-compose.yml restart"
echo "  Check status:  docker compose -f infrastructure/docker-compose.yml ps"
echo ""
