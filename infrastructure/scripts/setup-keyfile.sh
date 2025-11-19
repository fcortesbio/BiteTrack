#!/bin/bash

# MongoDB Keyfile Setup
# Sets up MongoDB replica set keyfile for authentication
#
# Usage: Called by init.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KEYFILE_PATH="$PROJECT_ROOT/keyfile"
EXAMPLE_PATH="$PROJECT_ROOT/keyfile.example"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_info "Setting up MongoDB keyfile..."

if [[ -f "$KEYFILE_PATH" ]]; then
    log_success "Keyfile already exists at $KEYFILE_PATH"
else
    if [[ -f "$EXAMPLE_PATH" ]]; then
        log_info "Copying from keyfile.example..."
        cp "$EXAMPLE_PATH" "$KEYFILE_PATH"
    else
        log_info "Generating new keyfile..."
        # Generate a random 1024-character base64 key
        openssl rand -base64 756 | tr -d '\n' > "$KEYFILE_PATH"
    fi
    
    log_success "Keyfile created at $KEYFILE_PATH"
fi

# Set proper permissions for MongoDB
chmod 600 "$KEYFILE_PATH"
log_success "Set keyfile permissions to 600"

log_success "MongoDB keyfile setup complete"
