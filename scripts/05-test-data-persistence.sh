#!/bin/bash

# BiteTrack Data Persistence Test Script
# This script tests MongoDB data persistence across various container restart scenarios
# Usage: ./test-data-persistence.sh [--clean] [--verbose]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ID="persistence-test-$(date +%s)"
TEST_DB="bitetrack"
COMPOSE_ENV_FILE=""  # Will be auto-detected
VERBOSE=false
CLEAN_ONLY=false

# MongoDB credentials (will be loaded from environment)
MONGO_USER=""
MONGO_PASS=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_ONLY=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--clean] [--verbose] [--help]"
            echo ""
            echo "Options:"
            echo "  --clean    Only cleanup test data and exit"
            echo "  --verbose  Enable verbose output"
            echo "  --help     Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Auto-detect which environment file is currently in use
detect_environment_file() {
    log_info "Detecting current environment configuration..."
    
    # Check if containers are running and inspect their environment
    if docker compose ps | grep -q "bitetrack-api"; then
        local node_env=$(docker inspect bitetrack-api | jq -r '.[0].Config.Env[]' | grep "NODE_ENV=" | cut -d'=' -f2 2>/dev/null || echo "unknown")
        local port=$(docker inspect bitetrack-api | jq -r '.[0].Config.Env[]' | grep "PORT=" | cut -d'=' -f2 2>/dev/null || echo "unknown")
        
        verbose_log "Detected NODE_ENV: $node_env"
        verbose_log "Detected PORT: $port"
        
        if [ "$node_env" = "production" ] && [ "$port" = "3000" ]; then
            COMPOSE_ENV_FILE=".env.production"
        elif [ "$node_env" = "development" ] && [ "$port" = "3001" ]; then
            COMPOSE_ENV_FILE=".env.development"
        else
            # Fallback: check which files exist
            if [ -f ".env.production" ] && [ ! -f ".env.development" ]; then
                COMPOSE_ENV_FILE=".env.production"
            elif [ -f ".env.development" ]; then
                COMPOSE_ENV_FILE=".env.development"
            else
                log_error "Cannot determine environment file to use"
                exit 1
            fi
        fi
    else
        # No containers running, use file precedence
        if [ -f ".env.production" ]; then
            COMPOSE_ENV_FILE=".env.production"
        elif [ -f ".env.development" ]; then
            COMPOSE_ENV_FILE=".env.development"
        else
            log_error "No environment files found"
            exit 1
        fi
    fi
    
    log_info "Using environment file: $COMPOSE_ENV_FILE"
    verbose_log "Environment detection completed"
}

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

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

verbose_log() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Load environment variables
load_environment() {
    log_info "Loading environment variables..."
    
    # Load from .env.development file if environment variables are not already set
    if [ -z "$MONGO_ROOT_USERNAME" ] || [ -z "$MONGO_ROOT_PASSWORD" ]; then
        if [ -f "$COMPOSE_ENV_FILE" ]; then
            verbose_log "Loading environment from $COMPOSE_ENV_FILE"
            # Source the file but don't override existing variables
            set -a  # automatically export all variables
            source <(grep -v '^#' "$COMPOSE_ENV_FILE" | grep -v '^$')
            set +a  # stop automatically exporting
        fi
    else
        verbose_log "Using MongoDB credentials from shell environment"
    fi
    
    # Set MongoDB credentials with proper precedence: shell env > .env.development > defaults
    MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
    MONGO_PASS="${MONGO_ROOT_PASSWORD:-supersecret}"
    
    if [ -z "$MONGO_USER" ] || [ -z "$MONGO_PASS" ]; then
        log_error "MongoDB credentials not found in environment variables"
        log_error "Please set MONGO_ROOT_USERNAME and MONGO_ROOT_PASSWORD"
        log_error "Or ensure $COMPOSE_ENV_FILE contains these variables"
        exit 1
    fi
    
    verbose_log "MongoDB user: $MONGO_USER"
    verbose_log "MongoDB password: [REDACTED]"
    log_success "Environment variables loaded successfully"
}

# Check if Docker Compose is available
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        exit 1
    fi
    
    # Environment file will be detected later
    # Check if at least one environment file exists
    if [ ! -f ".env.production" ] && [ ! -f ".env.development" ]; then
        log_error "No environment files found (.env.production or .env.development)"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Wait for MongoDB to be ready
wait_for_mongodb() {
    log_info "Waiting for MongoDB to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin --eval "db.adminCommand('ping')" &> /dev/null; then
            log_success "MongoDB is ready"
            return 0
        fi
        
        verbose_log "MongoDB not ready, attempt $attempt/$max_attempts"
        sleep 2
        ((attempt++))
    done
    
    log_error "MongoDB failed to become ready after $max_attempts attempts"
    return 1
}

# Insert test data
insert_test_data() {
    local data_id=$1
    local description=$2
    log_info "Inserting test data: $description"
    
    local result=$(docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin "$TEST_DB" --eval "
        db.persistence_test.insertOne({
            testId: '$data_id',
            description: '$description',
            timestamp: new Date(),
            testRun: '$TEST_ID'
        })
    " --quiet)
    
    if [[ $result == *"acknowledged: true"* ]]; then
        log_success "Test data inserted successfully"
        return 0
    else
        log_error "Failed to insert test data"
        return 1
    fi
}

# Verify test data exists
verify_test_data() {
    local data_id=$1
    local description=$2
    log_info "Verifying test data: $description"
    
    local result=$(docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin "$TEST_DB" --eval "
        db.persistence_test.findOne({testId: '$data_id'})
    " --quiet)
    
    if [[ $result == *"testId"* ]] && [[ $result == *"$data_id"* ]]; then
        log_success "Test data verified successfully"
        return 0
    else
        log_error "Test data not found or corrupted"
        verbose_log "Query result: $result"
        return 1
    fi
}

# Clean up test data
cleanup_test_data() {
    log_info "Cleaning up test data..."
    
    docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin "$TEST_DB" --eval "
        db.persistence_test.deleteMany({testRun: '$TEST_ID'})
    " --quiet > /dev/null
    
    # Also cleanup any old test data
    docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin "$TEST_DB" --eval "
        db.persistence_test.deleteMany({})
    " --quiet > /dev/null
    
    log_success "Test data cleanup completed"
}

# Test container restart
test_container_restart() {
    local container_name=$1
    local test_data_id="restart-$container_name-$(date +%s)"
    
    log_test "Testing $container_name container restart..."
    
    # Insert test data
    insert_test_data "$test_data_id" "Before $container_name restart"
    
    # Restart the container
    log_info "Restarting $container_name container..."
    docker compose stop "$container_name"
    verbose_log "$container_name container stopped"
    
    docker compose start "$container_name"
    verbose_log "$container_name container started"
    
    # Wait for services to be ready
    if [ "$container_name" = "mongodb" ]; then
        wait_for_mongodb
    else
        sleep 5  # Give API time to start
        # Test API health
        local max_attempts=10
        local attempt=1
        while [ $attempt -le $max_attempts ]; do
            if curl -s http://localhost:3000/bitetrack/health | grep -q "OK"; then
                break
            fi
            verbose_log "API not ready, attempt $attempt/$max_attempts"
            sleep 2
            ((attempt++))
        done
    fi
    
    # Verify data persistence
    verify_test_data "$test_data_id" "After $container_name restart"
    
    log_success "$container_name restart test passed"
}

# Test full stack restart
test_full_stack_restart() {
    local test_data_id="full-stack-$(date +%s)"
    
    log_test "Testing full stack restart..."
    
    # Insert test data
    insert_test_data "$test_data_id" "Before full stack restart"
    
    # Stop entire stack
    log_info "Stopping full stack..."
    docker compose down
    verbose_log "Full stack stopped"
    
    # Verify volume still exists
    if docker volume inspect bitetrack_mongodb_data &> /dev/null; then
        log_success "MongoDB volume preserved after stack shutdown"
    else
        log_error "MongoDB volume was removed - this should not happen!"
        return 1
    fi
    
    # Start entire stack
    log_info "Starting full stack..."
    docker compose --env-file "$COMPOSE_ENV_FILE" up -d --build
    verbose_log "Full stack started"
    
    # Wait for services
    wait_for_mongodb
    
    # Wait for API
    sleep 10
    local max_attempts=15
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/bitetrack/health | grep -q "OK"; then
            break
        fi
        verbose_log "API not ready, attempt $attempt/$max_attempts"
        sleep 3
        ((attempt++))
    done
    
    # Verify data persistence
    verify_test_data "$test_data_id" "After full stack restart"
    
    log_success "Full stack restart test passed"
}

# Ensure stack is running
ensure_stack_running() {
    log_info "Ensuring Docker Compose stack is running..."
    
    # Check if containers are running
    local running_containers=$(docker compose ps --services --filter "status=running" | wc -l)
    local total_services=2  # mongodb and bitetrack-api
    
    if [ "$running_containers" -lt "$total_services" ]; then
        log_info "Stack not fully running, starting services..."
        docker compose --env-file "$COMPOSE_ENV_FILE" up -d --build
        wait_for_mongodb
        sleep 5
    else
        log_success "Stack is already running"
    fi
}

# Main test execution
run_persistence_tests() {
    log_info "Starting BiteTrack Data Persistence Tests"
    echo "=============================================="
    echo "Test Run ID: $TEST_ID"
    echo "Timestamp: $(date)"
    echo "=============================================="
    
    # Ensure prerequisites
    check_prerequisites
    
    # Detect which environment file to use
    detect_environment_file
    
    # Load environment variables
    load_environment
    
    # Ensure stack is running
    ensure_stack_running
    
    # Test MongoDB container restart
    test_container_restart "mongodb"
    
    # Test API container restart
    test_container_restart "bitetrack-api"
    
    # Test full stack restart
    test_full_stack_restart
    
    # Cleanup test data
    cleanup_test_data
    
    echo "=============================================="
    log_success "All persistence tests passed! 🎉"
    log_info "Your data persistence is working correctly."
    echo "=============================================="
}

# Handle cleanup only mode
if [ "$CLEAN_ONLY" = true ]; then
    log_info "Cleanup mode: Removing all test data..."
    check_prerequisites
    detect_environment_file
    load_environment
    ensure_stack_running
    cleanup_test_data
    log_success "Cleanup completed"
    exit 0
fi

# Trap to cleanup on script exit
trap cleanup_test_data EXIT

# Run the tests
run_persistence_tests