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

# Determine which env file to use
if [[ "$SETUP_MODE" == "dev" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env.development"
elif [[ "$SETUP_MODE" == "prod" || "$SETUP_MODE" == "both" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env.production"
else
    log_error "Invalid SETUP_MODE: $SETUP_MODE"
    exit 1
fi

log_info "Using environment file: $ENV_FILE"

# Start MongoDB first
log_info "Starting MongoDB container..."
cd "$PROJECT_ROOT"
docker compose --env-file "$ENV_FILE" up -d mongodb

# Wait for MongoDB to be healthy
log_info "Waiting for MongoDB to be healthy..."
local max_attempts=30
local attempt=0

while [[ $attempt -lt $max_attempts ]]; do
    if docker compose ps mongodb | grep -q "healthy"; then
        log_success "MongoDB is healthy"
        break
    fi
    
    attempt=$((attempt + 1))
    log_info "MongoDB health check attempt $attempt/$max_attempts..."
    sleep 2
done

if [[ $attempt -eq $max_attempts ]]; then
    log_error "MongoDB failed to become healthy"
    docker compose logs mongodb --tail 20
    exit 1
fi

# Initialize replica set
log_info "Initializing MongoDB replica set..."
docker compose exec -T mongodb mongosh --quiet --eval "
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

log_success "MongoDB is ready"
log_info "MongoDB accessible at localhost:27017"
