#!/bin/bash
#
# BiteTrack Infrastructure Initialization Script
# Sets up complete BiteTrack stack with Traefik, API, Frontend, MCP, and MongoDB
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  BiteTrack Infrastructure Initialization${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Check prerequisites
echo -e "\n${YELLOW}🔍 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose found${NC}"

# Navigate to project root
cd "$(dirname "$0")/../.."
PROJECT_ROOT=$(pwd)

echo -e "${GREEN}✓ Project root: ${PROJECT_ROOT}${NC}"

# Create .env if missing
if [ ! -f "${PROJECT_ROOT}/.env" ]; then
    echo -e "\n${YELLOW}📝 Creating .env file from template...${NC}"
    cp "${PROJECT_ROOT}/.env.example" "${PROJECT_ROOT}/.env"
    
    # Generate secure secrets
    echo -e "${YELLOW}🔐 Generating secure secrets...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)
    MONGO_PASSWORD=$(openssl rand -base64 24)
    
    # Update .env with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "${PROJECT_ROOT}/.env"
        sed -i '' "s|MONGO_ROOT_PASSWORD=change_this_secure_password|MONGO_ROOT_PASSWORD=${MONGO_PASSWORD}|" "${PROJECT_ROOT}/.env"
        sed -i '' "s|mongodb://admin:change_this_secure_password@|mongodb://admin:${MONGO_PASSWORD}@|" "${PROJECT_ROOT}/.env"
    else
        # Linux
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "${PROJECT_ROOT}/.env"
        sed -i "s|MONGO_ROOT_PASSWORD=change_this_secure_password|MONGO_ROOT_PASSWORD=${MONGO_PASSWORD}|" "${PROJECT_ROOT}/.env"
        sed -i "s|mongodb://admin:change_this_secure_password@|mongodb://admin:${MONGO_PASSWORD}@|" "${PROJECT_ROOT}/.env"
    fi
    
    echo -e "${GREEN}✓ .env file created with secure secrets${NC}"
    echo -e "${YELLOW}⚠️  Please review .env and update any additional configuration${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Build all service images
echo -e "\n${YELLOW}🏗️  Building service images...${NC}"
cd "${PROJECT_ROOT}/infrastructure"
docker compose build --parallel

echo -e "${GREEN}✓ All images built successfully${NC}"

# Initialize MongoDB replica set
echo -e "\n${YELLOW}🗄️  Starting MongoDB...${NC}"
docker compose up -d mongodb

echo -e "${YELLOW}⏳ Waiting for MongoDB to be ready...${NC}"
sleep 10

echo -e "${YELLOW}🔧 Initializing MongoDB replica set...${NC}"
docker compose exec -T mongodb mongosh --quiet --eval "
  try {
    rs.initiate({
      _id: 'rs0',
      members: [{ _id: 0, host: 'mongodb:27017' }]
    });
    print('✓ Replica set initialized');
  } catch(e) {
    if (e.codeName === 'AlreadyInitialized') {
      print('✓ Replica set already initialized');
    } else {
      throw e;
    }
  }
" || echo -e "${YELLOW}⚠️  Replica set may already be initialized${NC}"

docker compose stop mongodb-init 2>/dev/null || true

echo -e "${GREEN}✓ MongoDB initialized${NC}"

# Start all services
echo -e "\n${YELLOW}🚀 Starting all services...${NC}"
docker compose up -d

# Wait for services to be healthy
echo -e "\n${YELLOW}🏥 Waiting for services to be healthy...${NC}"
sleep 15

# Health checks
echo -e "\n${YELLOW}🧪 Running health checks...${NC}"

check_service() {
    local name=$1
    local url=$2
    
    if curl -f -s "$url" > /dev/null; then
        echo -e "${GREEN}✓ $name is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $name is not responding${NC}"
        return 1
    fi
}

check_service "Frontend" "http://localhost/"
check_service "API" "http://localhost/bitetrack/health"
check_service "MCP" "http://localhost/mcp/health"
check_service "Traefik Dashboard" "http://localhost:8080"

# Summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ BiteTrack Infrastructure Initialized!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}📍 Access Points:${NC}"
echo -e "  Frontend:         ${BLUE}http://localhost${NC}"
echo -e "  API:              ${BLUE}http://localhost/bitetrack${NC}"
echo -e "  API Docs:         ${BLUE}http://localhost/bitetrack/api-docs${NC}"
echo -e "  MCP Server:       ${BLUE}http://localhost/mcp${NC}"
echo -e "  Traefik Dashboard: ${BLUE}http://localhost:8080${NC}"

echo -e "\n${YELLOW}🛠️  Useful Commands:${NC}"
echo -e "  View logs:        ${BLUE}docker compose -f infrastructure/docker-compose.yml logs -f${NC}"
echo -e "  Stop services:    ${BLUE}docker compose -f infrastructure/docker-compose.yml down${NC}"
echo -e "  Restart services: ${BLUE}docker compose -f infrastructure/docker-compose.yml restart${NC}"

echo -e "\n${GREEN}🎉 Setup complete!${NC}\n"
