#!/bin/bash

# Start Docker Containers
# Starts MongoDB and initializes replica set
#
# Usage: Called by init.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================================${NC}"
}

log_header "STARTING DOCKER CONTAINERS"

# Determine which env file to use and what to start
if [[ "$SETUP_MODE" == "dev" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env.development"
    START_MODE="mongodb-only"
elif [[ "$SETUP_MODE" == "prod" || "$SETUP_MODE" == "both" ]]; then
    # Both prod and 'both' modes start the full stack
    ENV_FILE="$PROJECT_ROOT/.env.production"
    START_MODE="full-stack"
else
    log_error "Invalid SETUP_MODE: $SETUP_MODE"
    exit 1
fi

log_info "Using environment file: $ENV_FILE"
log_info "Start mode: $START_MODE"

cd "$PROJECT_ROOT"

# Start services based on mode
if [[ "$START_MODE" == "full-stack" ]]; then
    log_info "Starting all services (production mode)..."
    docker compose -f infrastructure/docker-compose.yml up -d
    
    log_info "Waiting for all services to start..."
    sleep 10
else
    log_info "Starting MongoDB only (development mode)..."
    docker compose -f infrastructure/docker-compose.yml up -d mongodb
fi

# Wait for MongoDB to be healthy
log_info "Waiting for MongoDB to be healthy..."
max_attempts=30
attempt=0

while [[ $attempt -lt $max_attempts ]]; do
    if docker compose -f infrastructure/docker-compose.yml ps mongodb | grep -q "healthy"; then
        log_success "MongoDB is healthy"
        break
    fi
    
    attempt=$((attempt + 1))
    log_info "MongoDB health check attempt $attempt/$max_attempts..."
    sleep 2
done

if [[ $attempt -eq $max_attempts ]]; then
    log_error "MongoDB failed to become healthy"
    docker compose -f infrastructure/docker-compose.yml logs mongodb --tail 20
    exit 1
fi

# Initialize replica set
log_info "Initializing MongoDB replica set..."
docker compose -f infrastructure/docker-compose.yml exec -T mongodb mongosh --quiet --eval "
try {
    rs.initiate({
        _id: 'rs0',
        members: [{ _id: 0, host: 'mongodb:27017' }]
    });
    print('[SUCCESS] Replica set initialized');
} catch(e) {
    if (e.codeName === 'AlreadyInitialized') {
        print('[INFO] Replica set already initialized');
    } else {
        throw e;
    }
}
" || log_warning "Replica set may already be initialized"

# Wait a moment for replica set to stabilize
sleep 5

# Create MongoDB admin user
log_info "Creating MongoDB admin user..."

# Source environment variables from symlink
if [ -f "$PROJECT_ROOT/infrastructure/.env" ]; then
    source "$PROJECT_ROOT/infrastructure/.env"
fi

docker compose -f infrastructure/docker-compose.yml exec -T mongodb mongosh --quiet --eval "
db = db.getSiblingDB('admin');
try {
    db.createUser({
        user: '$MONGO_ROOT_USERNAME',
        pwd: '$MONGO_ROOT_PASSWORD',
        roles: [
            { role: 'root', db: 'admin' },
            { role: 'readWrite', db: 'bitetrack' }
        ]
    });
    print('[SUCCESS] MongoDB user created');
} catch(e) {
    if (e.codeName === 'DuplicateKey') {
        print('[INFO] User already exists');
    } else {
        print('[ERROR] User creation failed: ' + e.message);
    }
}
" || log_warning "User may already exist"

log_success "MongoDB is ready"
log_info "MongoDB accessible at localhost:27017"

# If full stack was started, check other services
if [[ "$START_MODE" == "full-stack" ]]; then
    echo ""
    log_info "Checking other services..."
    
    # Wait a bit more for other services
    sleep 10
    
    # Show container status
    log_info "Container status:"
    docker compose -f infrastructure/docker-compose.yml ps
    
    echo ""
    log_success "Full production stack started"
    log_info "Access points:"
    echo "  - Frontend: http://localhost (Traefik routing)"
    echo "  - API: http://localhost/bitetrack"
    echo "  - MCP: http://localhost/mcp"
    echo "  - Traefik Dashboard: http://localhost:8080"
else
    echo ""
    log_info "MongoDB ready for development"
    log_info "Run 'npm run dev' to start development services locally"
fi
