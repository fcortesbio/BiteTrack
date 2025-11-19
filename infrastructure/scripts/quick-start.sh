#!/bin/bash

# BiteTrack Quick Start Script
# Uses existing environment files to quickly start the required services.
#
# Usage: Called by init.sh when "Quick setup" is selected.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Helper functions
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

# --- Main Logic ---

log_header "QUICK START"
log_info "Using existing environment files to start services."

cd "$PROJECT_ROOT"

# Check for environment files
ENV_DEV_EXISTS=false
ENV_PROD_EXISTS=false
[ -f ".env.development" ] && ENV_DEV_EXISTS=true
[ -f ".env.production" ] && ENV_PROD_EXISTS=true

if ! $ENV_DEV_EXISTS && ! $ENV_PROD_EXISTS; then
    log_error "No environment files found (.env.development or .env.production)."
    log_error "Please run the full setup first with 'npm run init'."
    exit 1
fi

# Determine which environment to start
START_ENV=""
if $ENV_DEV_EXISTS && $ENV_PROD_EXISTS; then
    echo ""
    echo -e "${YELLOW}Both development and production environments found.${NC}"
    echo "  1. Start Development Environment (MongoDB only)"
    echo "  2. Start Production Environment (Full Docker Stack)"
    echo ""
    read -p "Choose which environment to start [1/2]: " choice
    case "$choice" in
        1) START_ENV="dev" ;;
        2) START_ENV="prod" ;;
        *) log_error "Invalid selection. Aborting."; exit 1 ;;
    esac
elif $ENV_DEV_EXISTS; then
    log_info "Found .env.development. Starting development environment."
    START_ENV="dev"
else
    log_info "Found .env.production. Starting production environment."
    START_ENV="prod"
fi

# Set variables based on choice
if [[ "$START_ENV" == "dev" ]]; then
    ENV_FILE=".env.development"
    START_MODE="mongodb-only"
    log_info "Starting MongoDB for local development..."
else
    ENV_FILE=".env.production"
    START_MODE="full-stack"
    log_info "Starting full production stack..."
fi

# Start services
if [[ "$START_MODE" == "full-stack" ]]; then
    docker compose -f infrastructure/docker-compose.yml --env-file "$ENV_FILE" up -d
else
    docker compose -f infrastructure/docker-compose.yml --env-file "$ENV_FILE" up -d mongodb
fi

# Wait for MongoDB to be healthy
log_info "Waiting for MongoDB to be healthy..."
max_attempts=30
attempt=0
while [[ $attempt -lt $max_attempts ]]; do
    if docker compose -f infrastructure/docker-compose.yml ps mongodb 2>/dev/null | grep -q "healthy"; then
        log_success "MongoDB is healthy."
        break
    fi
    attempt=$((attempt + 1))
    echo -e "${BLUE}[INFO]${NC} Waiting... (attempt $attempt/$max_attempts)"
    sleep 2
done

if [[ $attempt -eq $max_attempts ]]; then
    log_error "MongoDB failed to become healthy in time."
    docker compose -f infrastructure/docker-compose.yml logs mongodb --tail 20
    exit 1
fi

# Initialize replica set
log_info "Ensuring MongoDB replica set is initialized..."
docker compose -f infrastructure/docker-compose.yml exec -T mongodb mongosh --quiet --eval "
try {
    rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] });
    print('[SUCCESS] Replica set initialized');
} catch(e) {
    if (e.codeName === 'AlreadyInitialized') {
        print('[INFO] Replica set already initialized');
    } else { throw e; }
}" || log_warning "Replica set initialization check had a minor issue, but continuing."

sleep 3
log_success "MongoDB is ready at localhost:27017"

# Final summary message
echo ""
if [[ "$START_MODE" == "full-stack" ]]; then
    log_success "Full production stack is running."
    log_info "Access API at: http://localhost/bitetrack/health"
    log_info "View all containers with: docker ps"
else
    log_success "MongoDB is running and ready for development."
    log_info "You can now start your local services with: npm run dev"
fi
echo ""
