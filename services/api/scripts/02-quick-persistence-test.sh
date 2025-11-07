#!/bin/bash

# Quick Data Persistence Test - Short version for CI/automated testing
# This is a simplified version that runs basic persistence checks

set -e

# Load shared environment functions
source "$(dirname "$0")/lib/env-loader.sh"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Quick test function
quick_persistence_test() {
    local test_id="quick-test-$(date +%s)"
    
    # Setup BiteTrack environment (auto-detects production vs development)
    if ! setup_bitetrack_environment false; then
        log_error "Failed to setup environment"
        exit 1
    fi
    
    local env_type=$(detect_environment_type)
    log_info "Running quick persistence test [$env_type environment]..."
    
    # Insert test data
    docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin bitetrack --eval "
        db.quick_test.insertOne({
            testId: '$test_id',
            message: 'Quick persistence test',
            timestamp: new Date()
        })
    " --quiet > /dev/null
    
    # Verify data exists
    local result=$(docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin bitetrack --eval "
        db.quick_test.findOne({testId: '$test_id'})
    " --quiet)
    
    if [[ $result == *"$test_id"* ]]; then
        log_success "Quick persistence test passed"
    else
        log_error "Quick persistence test failed"
        return 1
    fi
    
    # Cleanup
    docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin bitetrack --eval "
        db.quick_test.deleteOne({testId: '$test_id'})
    " --quiet > /dev/null
    
    log_info "Quick test completed successfully"
}

# Run the test
quick_persistence_test