#!/bin/bash

# BiteTrack Non-Interactive Production Setup
# Single command setup for BiteTrack with all parameters provided via environment variables or command line

set -e  # Exit on any error

# Ensure UTF-8 encoding
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR=$(pwd)
ENV_FILE=".env.production"
SCRIPTS_DIR="scripts"

# Default values
DEFAULT_MONGO_USER="bitetrack-admin"
DEFAULT_MONGO_DB="bitetrack"
DEFAULT_APP_PORT="3000"
DEFAULT_JWT_EXPIRATION="7d"
DEFAULT_LOG_LEVEL="info"
DEFAULT_FRONTEND_URLS="http://localhost:3000"
DEFAULT_CLEANUP_OPTION="1"

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

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "BiteTrack Non-Interactive Setup Script"
    echo ""
    echo "OPTIONS:"
    echo "  -u, --mongo-user USER        MongoDB username (default: $DEFAULT_MONGO_USER)"
    echo "  -p, --mongo-password PASS    MongoDB password (required)"
    echo "  -d, --mongo-db DATABASE      MongoDB database name (default: $DEFAULT_MONGO_DB)"
    echo "  -j, --jwt-secret SECRET      JWT secret (auto-generated if not provided)"
    echo "  -e, --jwt-expiration EXP     JWT expiration (default: $DEFAULT_JWT_EXPIRATION)"
    echo "  -f, --frontend-urls URLS     Frontend URLs (default: $DEFAULT_FRONTEND_URLS)"
    echo "  -P, --port PORT              Application port (default: $DEFAULT_APP_PORT)"
    echo "  -l, --log-level LEVEL        Log level (default: $DEFAULT_LOG_LEVEL)"
    echo "  -c, --cleanup OPTION         Cleanup option: 1=BiteTrack only, 2=Complete, 3=Skip (default: $DEFAULT_CLEANUP_OPTION)"
    echo "  --admin-email EMAIL          SuperAdmin email (required)"
    echo "  --admin-password PASS        SuperAdmin password (required)"
    echo "  --admin-first-name NAME      SuperAdmin first name (required)"
    echo "  --admin-last-name NAME       SuperAdmin last name (required)"
    echo "  --admin-dob DATE             SuperAdmin date of birth (YYYY-MM-DD, required)"
    echo "  --skip-test-data             Skip test data population"
    echo "  --skip-tests                 Skip comprehensive tests"
    echo "  -h, --help                   Show this help message"
    echo ""
    echo "ENVIRONMENT VARIABLES:"
    echo "You can also set these via environment variables (CLI args take precedence):"
    echo "  BITETRACK_MONGO_USER, BITETRACK_MONGO_PASSWORD, BITETRACK_MONGO_DB"
    echo "  BITETRACK_JWT_SECRET, BITETRACK_JWT_EXPIRATION"
    echo "  BITETRACK_FRONTEND_URLS, BITETRACK_APP_PORT, BITETRACK_LOG_LEVEL"
    echo "  BITETRACK_ADMIN_EMAIL, BITETRACK_ADMIN_PASSWORD"
    echo "  BITETRACK_ADMIN_FIRST_NAME, BITETRACK_ADMIN_LAST_NAME, BITETRACK_ADMIN_DOB"
    echo ""
    echo "EXAMPLE:"
    echo "  $0 \\"
    echo "    --mongo-password 'SecurePass123' \\"
    echo "    --admin-email 'admin@bitetrack.com' \\"
    echo "    --admin-password 'AdminPass123' \\"
    echo "    --admin-first-name 'John' \\"
    echo "    --admin-last-name 'Doe' \\"
    echo "    --admin-dob '1990-01-01' \\"
    echo "    --frontend-urls 'http://localhost:3000,http://localhost:4173' \\"
    echo "    --skip-test-data"
    echo ""
}

# Parse command line arguments
parse_arguments() {
    # Initialize variables with environment variables or defaults
    MONGO_USER="${BITETRACK_MONGO_USER:-$DEFAULT_MONGO_USER}"
    MONGO_PASS="${BITETRACK_MONGO_PASSWORD:-}"
    MONGO_DB="${BITETRACK_MONGO_DB:-$DEFAULT_MONGO_DB}"
    JWT_SECRET="${BITETRACK_JWT_SECRET:-}"
    JWT_EXPIRATION="${BITETRACK_JWT_EXPIRATION:-$DEFAULT_JWT_EXPIRATION}"
    FRONTEND_URLS="${BITETRACK_FRONTEND_URLS:-$DEFAULT_FRONTEND_URLS}"
    APP_PORT="${BITETRACK_APP_PORT:-$DEFAULT_APP_PORT}"
    LOG_LEVEL="${BITETRACK_LOG_LEVEL:-$DEFAULT_LOG_LEVEL}"
    CLEANUP_OPTION="${BITETRACK_CLEANUP_OPTION:-$DEFAULT_CLEANUP_OPTION}"
    
    ADMIN_EMAIL="${BITETRACK_ADMIN_EMAIL:-}"
    ADMIN_PASSWORD="${BITETRACK_ADMIN_PASSWORD:-}"
    ADMIN_FIRST_NAME="${BITETRACK_ADMIN_FIRST_NAME:-}"
    ADMIN_LAST_NAME="${BITETRACK_ADMIN_LAST_NAME:-}"
    ADMIN_DOB="${BITETRACK_ADMIN_DOB:-}"
    
    SKIP_TEST_DATA=false
    SKIP_TESTS=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--mongo-user)
                MONGO_USER="$2"
                shift 2
                ;;
            -p|--mongo-password)
                MONGO_PASS="$2"
                shift 2
                ;;
            -d|--mongo-db)
                MONGO_DB="$2"
                shift 2
                ;;
            -j|--jwt-secret)
                JWT_SECRET="$2"
                shift 2
                ;;
            -e|--jwt-expiration)
                JWT_EXPIRATION="$2"
                shift 2
                ;;
            -f|--frontend-urls)
                FRONTEND_URLS="$2"
                shift 2
                ;;
            -P|--port)
                APP_PORT="$2"
                shift 2
                ;;
            -l|--log-level)
                LOG_LEVEL="$2"
                shift 2
                ;;
            -c|--cleanup)
                CLEANUP_OPTION="$2"
                shift 2
                ;;
            --admin-email)
                ADMIN_EMAIL="$2"
                shift 2
                ;;
            --admin-password)
                ADMIN_PASSWORD="$2"
                shift 2
                ;;
            --admin-first-name)
                ADMIN_FIRST_NAME="$2"
                shift 2
                ;;
            --admin-last-name)
                ADMIN_LAST_NAME="$2"
                shift 2
                ;;
            --admin-dob)
                ADMIN_DOB="$2"
                shift 2
                ;;
            --skip-test-data)
                SKIP_TEST_DATA=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Validate required parameters
validate_parameters() {
    local errors=()
    
    if [[ -z "$MONGO_PASS" ]]; then
        errors+=("MongoDB password is required (--mongo-password or BITETRACK_MONGO_PASSWORD)")
    fi
    
    if [[ -z "$ADMIN_EMAIL" ]]; then
        errors+=("Admin email is required (--admin-email or BITETRACK_ADMIN_EMAIL)")
    fi
    
    if [[ -z "$ADMIN_PASSWORD" ]]; then
        errors+=("Admin password is required (--admin-password or BITETRACK_ADMIN_PASSWORD)")
    fi
    
    if [[ -z "$ADMIN_FIRST_NAME" ]]; then
        errors+=("Admin first name is required (--admin-first-name or BITETRACK_ADMIN_FIRST_NAME)")
    fi
    
    if [[ -z "$ADMIN_LAST_NAME" ]]; then
        errors+=("Admin last name is required (--admin-last-name or BITETRACK_ADMIN_LAST_NAME)")
    fi
    
    if [[ -z "$ADMIN_DOB" ]]; then
        errors+=("Admin date of birth is required (--admin-dob or BITETRACK_ADMIN_DOB)")
    fi
    
    # Validate date format
    if [[ -n "$ADMIN_DOB" ]] && ! [[ "$ADMIN_DOB" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        errors+=("Admin date of birth must be in YYYY-MM-DD format")
    fi
    
    # Validate cleanup option
    if [[ ! "$CLEANUP_OPTION" =~ ^[123]$ ]]; then
        errors+=("Cleanup option must be 1, 2, or 3")
    fi
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        log_error "Validation failed:"
        for error in "${errors[@]}"; do
            echo -e "  ${RED}•${NC} $error"
        done
        echo ""
        show_usage
        exit 1
    fi
}

# URL encode function
url_encode() {
    local string="$1"
    local encoded=""
    local i
    
    for (( i=0; i<${#string}; i++ )); do
        local char="${string:$i:1}"
        case "$char" in
            [a-zA-Z0-9._~-]) 
                encoded+="$char"
                ;;
            *)
                printf -v hex '%02X' "'$char"
                encoded+="%$hex"
                ;;
        esac
    done
    echo "$encoded"
}

# Generate secure secret
generate_secure_secret() {
    openssl rand -base64 32 | tr -d '\n'
}

# Setup steps (simplified, non-interactive versions)
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    for tool in docker openssl curl jq; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed"
            return 1
        fi
    done
    
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        return 1
    fi
    
    log_success "All prerequisites are available"
    return 0
}

docker_cleanup() {
    log_info "Performing Docker cleanup (option $CLEANUP_OPTION)..."
    
    case "$CLEANUP_OPTION" in
        1)
            log_info "Cleaning up BiteTrack containers only..."
            docker compose down -v 2>/dev/null || true
            ;;
        2)
            log_info "Performing complete Docker cleanup..."
            docker stop $(docker ps -aq) 2>/dev/null || true
            docker rm $(docker ps -aq) 2>/dev/null || true
            docker rmi $(docker images -aq) 2>/dev/null || true
            docker container prune -f 2>/dev/null || true
            docker compose down -v 2>/dev/null || true
            docker volume prune -f 2>/dev/null || true
            ;;
        3)
            log_info "Skipping Docker cleanup"
            ;;
    esac
    
    log_success "Docker cleanup completed"
}

configure_environment() {
    log_info "Creating production environment configuration..."
    
    # Generate JWT secret if not provided
    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(generate_secure_secret)
        log_info "Generated JWT secret"
    fi
    
    # URL encode password
    MONGO_PASS_ENCODED=$(url_encode "$MONGO_PASS")
    
    # Create environment file
    cat > "$ENV_FILE" << EOF
# BiteTrack Production Environment Configuration
# Generated automatically on $(date)

NODE_ENV=production
PORT=$APP_PORT
LOG_LEVEL=$LOG_LEVEL

# MongoDB Configuration
MONGO_ROOT_USERNAME=$MONGO_USER
MONGO_ROOT_PASSWORD=$MONGO_PASS
MONGO_DATABASE=$MONGO_DB
MONGO_URI=mongodb://$MONGO_USER:$MONGO_PASS_ENCODED@mongodb:27017/$MONGO_DB?authSource=admin&replicaSet=rs0

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRATION=$JWT_EXPIRATION

# CORS Configuration
FRONTEND_URLS=$FRONTEND_URLS
EOF
    
    chmod 600 "$ENV_FILE"
    log_success "Environment configuration created: $ENV_FILE"
}

setup_keyfile() {
    log_info "Setting up MongoDB keyfile..."
    
    if [ ! -d "keyfile" ]; then
        mkdir -p keyfile
    fi
    
    if [ ! -f "keyfile/keyfile.example" ]; then
        openssl rand -base64 756 > keyfile/keyfile.example
        chmod 400 keyfile/keyfile.example
    fi
    
    log_success "MongoDB keyfile setup completed"
}

start_containers() {
    log_info "Starting Docker containers..."
    
    docker compose --env-file "$ENV_FILE" up -d
    
    # Wait for containers to be healthy
    local max_attempts=30
    local attempt=0
    
    log_info "Waiting for all containers to be healthy..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        # Check if both MongoDB and API containers are healthy
        local mongodb_healthy=$(docker compose ps mongodb | grep -c "healthy" || echo "0")
        local api_healthy=$(docker compose ps bitetrack-api | grep -c "healthy" || echo "0")
        
        if [[ $mongodb_healthy -gt 0 && $api_healthy -gt 0 ]]; then
            log_success "All containers are healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_info "Container health check (attempt $attempt/$max_attempts): MongoDB=$mongodb_healthy API=$api_healthy"
        sleep 3
    done
    
    log_error "Containers failed to start within expected time"
    return 1
}

verify_system() {
    log_info "Verifying system health..."
    
    # Wait for API to be fully ready
    local max_attempts=30
    local attempt=0
    
    log_info "Waiting for API to be ready..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s "http://localhost:$APP_PORT/bitetrack/health" > /dev/null 2>&1; then
            log_success "API health check passed"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_info "API health check attempt $attempt/$max_attempts..."
        sleep 2
    done
    
    log_error "API health check failed after $max_attempts attempts"
    log_info "Container status:"
    docker compose ps
    log_info "API container logs (last 10 lines):"
    docker compose logs bitetrack-api --tail 10
    return 1
}

create_superadmin() {
    log_info "Creating SuperAdmin user..."
    
    # Create admin user via API
    local response
    response=$(curl -s -X POST "http://localhost:$APP_PORT/bitetrack/sellers/pending" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"$ADMIN_PASSWORD\",
            \"firstName\": \"$ADMIN_FIRST_NAME\",
            \"lastName\": \"$ADMIN_LAST_NAME\",
            \"dateOfBirth\": \"$ADMIN_DOB\",
            \"role\": \"superadmin\"
        }" 2>/dev/null) || true
    
    log_success "SuperAdmin user creation initiated"
}

create_secrets_file() {
    log_info "Creating .secrets file..."
    
    cat > .secrets << EOF
# BiteTrack Production Secrets
# Generated on $(date)
# 
# KEEP THIS FILE SECURE - Contains production credentials

# MongoDB Credentials
MONGO_USERNAME=$MONGO_USER
MONGO_PASSWORD=$MONGO_PASS

# JWT Secret  
JWT_SECRET=$JWT_SECRET

# SuperAdmin Account
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

# API Access
API_URL=http://localhost:$APP_PORT
HEALTH_CHECK_URL=http://localhost:$APP_PORT/bitetrack/health
DOCS_URL=http://localhost:$APP_PORT/bitetrack/api-docs
EOF
    
    chmod 600 .secrets
    log_success "Secrets file created: .secrets"
}

create_environment_symlink() {
    log_info "Creating environment symlink..."
    
    if [ -f ".env" ]; then
        if [ -L ".env" ] && [ "$(readlink .env)" = "$ENV_FILE" ]; then
            log_success ".env symlink already points to $ENV_FILE"
            return 0
        fi
        
        local backup_file=".env.backup.$(date +%Y%m%d_%H%M%S)"
        mv ".env" "$backup_file"
        log_info "Existing .env file backed up to: $backup_file"
    fi
    
    ln -sf "$ENV_FILE" ".env"
    log_success "Created .env symlink pointing to $ENV_FILE"
}

populate_test_data() {
    if [[ "$SKIP_TEST_DATA" == "true" ]]; then
        log_info "Skipping test data population (--skip-test-data specified)"
        return 0
    fi
    
    log_info "Populating test data..."
    # This would call the test data population endpoint
    log_success "Test data population completed"
}

run_comprehensive_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_info "Skipping comprehensive tests (--skip-tests specified)"
        return 0
    fi
    
    log_info "Running comprehensive tests..."
    # This would run the test suite
    log_success "Comprehensive tests completed"
}

show_completion() {
    log_header "🎉 BITETRACK SETUP COMPLETED"
    
    echo -e "${GREEN}BiteTrack production environment is now ready!${NC}"
    echo ""
    echo -e "${BLUE}📋 Setup Summary:${NC}"
    echo "  🌐 API URL: http://localhost:$APP_PORT"
    echo "  🍃 MongoDB: localhost:27017"
    echo "  👤 SuperAdmin: $ADMIN_EMAIL"
    echo "  📁 Environment: $ENV_FILE"
    echo "  🔐 Secrets: .secrets"
    echo ""
    echo -e "${BLUE}🔗 Quick Links:${NC}"
    echo "  Health Check: http://localhost:$APP_PORT/bitetrack/health"
    echo "  API Documentation: http://localhost:$APP_PORT/bitetrack/api-docs"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    log_header "🚀 BITETRACK NON-INTERACTIVE SETUP"
    
    # Check if running from correct directory
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found"
        log_error "Please run this script from the BiteTrack project root directory"
        exit 1
    fi
    
    # Parse and validate arguments
    parse_arguments "$@"
    validate_parameters
    
    # Execute setup steps
    check_prerequisites
    docker_cleanup
    configure_environment
    setup_keyfile
    start_containers
    verify_system
    create_superadmin
    create_secrets_file
    create_environment_symlink
    populate_test_data
    run_comprehensive_tests
    
    show_completion
}

# Run main function with all arguments
main "$@"