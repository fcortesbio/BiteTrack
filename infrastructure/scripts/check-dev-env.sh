#!/bin/bash

# Pre-flight checks for npm run dev
# Validates that .env.development exists and MongoDB is running

set -e

# Colors (NO EMOJIS)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.development"

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

# Check if .env.development exists
if [ ! -f "$ENV_FILE" ]; then
    log_error ".env.development not found at $PROJECT_ROOT"
    echo ""
    echo "Please run one of the following to set up your environment:"
    echo "  npm run init              (interactive setup)"
    echo ""
    exit 1
fi

log_success ".env.development found"

# Check if MongoDB is accessible
if ! nc -z localhost 27017 2>/dev/null; then
    log_warning "MongoDB does not appear to be running on localhost:27017"
    echo ""
    echo "Please start MongoDB using one of the following:"
    echo "  docker compose up -d mongodb    (start MongoDB only)"
    echo "  npm run init                     (full initialization)"
    echo ""
    exit 1
fi

log_success "MongoDB is accessible at localhost:27017"

log_success "Environment checks passed - ready for development"
exit 0
