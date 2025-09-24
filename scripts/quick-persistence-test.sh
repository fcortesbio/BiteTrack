#!/bin/bash

# Quick Data Persistence Test - Short version for CI/automated testing
# This is a simplified version that runs basic persistence checks

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
load_environment() {
    # Load from .env.docker file if environment variables are not already set
    if [ -z "$MONGO_ROOT_USERNAME" ] || [ -z "$MONGO_ROOT_PASSWORD" ]; then
        if [ -f ".env.docker" ]; then
            # Export variables from .env.docker (avoiding comments and empty lines)
            set -a  # automatically export all variables
            source <(grep -v '^#' ".env.docker" | grep -v '^$')
            set +a  # stop automatically exporting
        fi
    fi
    
    # Set MongoDB credentials from environment or use defaults
    MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
    MONGO_PASS="${MONGO_ROOT_PASSWORD:-supersecret}"
    
    if [ -z "$MONGO_USER" ] || [ -z "$MONGO_PASS" ]; then
        log_error "MongoDB credentials not found in environment variables"
        log_error "Please set MONGO_ROOT_USERNAME and MONGO_ROOT_PASSWORD"
        exit 1
    fi
}

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
    
    # Load environment variables
    load_environment
    
    log_info "Running quick persistence test..."
    
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