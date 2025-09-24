#!/bin/bash

# BiteTrack Production Setup Wizard
# Interactive script to set up BiteTrack from scratch for production deployment
# This script orchestrates all numbered scripts in the correct order

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR=$(pwd)
ENV_FILE=".env.production"
SCRIPTS_DIR="scripts"

# Helper functions
log_header() {
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================================${NC}"
}

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

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

prompt_user() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        echo -ne "${YELLOW}$prompt${NC} [${CYAN}$default${NC}]: "
    else
        echo -ne "${YELLOW}$prompt${NC}: "
    fi
    
    read -r user_input
    if [ -z "$user_input" ] && [ -n "$default" ]; then
        user_input="$default"
    fi
    
    eval "$var_name=\"$user_input\""
}

prompt_password() {
    local prompt="$1"
    local var_name="$2"
    
    echo -ne "${YELLOW}$prompt${NC}: "
    read -s user_input
    echo ""
    eval "$var_name=\"$user_input\""
}

confirm_action() {
    local prompt="$1"
    echo -ne "${YELLOW}$prompt${NC} [y/N]: "
    read -r response
    case "$response" in
        [yY]|[yY][eE][sS]) return 0 ;;
        *) return 1 ;;
    esac
}

generate_secure_secret() {
    openssl rand -base64 32 | tr -d '\n'
}

# Welcome and prerequisites check
show_welcome() {
    clear
    echo -e "${CYAN}"
    echo "     ____  _ _       _____                _    "
    echo "    |  _ \\(_) |_ ___|_   _| __ __ _  ___| | __"
    echo "    | |_) | | __/ _ \\ | || '__/ _\` |/ __| |/ /"
    echo "    |  _ <| | ||  __/ | || | | (_| | (__|   < "
    echo "    |_| \\_\\_|\\__\\___| |_||_|  \\__,_|\\___|_|\\_\\"
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}🚀 Production Setup Wizard${NC}"
    echo -e "This interactive script will guide you through setting up"
    echo -e "BiteTrack for production deployment from scratch."
    echo ""
    echo -e "${BLUE}What this script will do:${NC}"
    echo "  📋 1. Clean up existing Docker environment (optional)"
    echo "  🔧 2. Configure production environment variables"
    echo "  🔐 3. Generate MongoDB keyfile"
    echo "  🐳 4. Start Docker containers"
    echo "  ✅ 5. Verify system health"
    echo "  👤 6. Create SuperAdmin user"
    echo "  📊 7. Populate test data (optional)"
    echo "  🧪 8. Run comprehensive tests"
    echo ""
}

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        echo "Please install Docker and try again."
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        echo "Please install Docker Compose and try again."
        exit 1
    fi
    
    # Check required tools
    for tool in openssl curl jq; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed"
            echo "Please install $tool and try again."
            exit 1
        fi
    done
    
    log_success "All prerequisites are available"
}

docker_cleanup() {
    log_header "🧹 DOCKER CLEANUP"
    
    log_warning "This will remove ALL Docker containers, images, and free up disk space."
    log_warning "This is useful for a completely fresh start but will affect other projects too."
    
    if confirm_action "Do you want to perform a complete Docker cleanup?"; then
        log_info "Performing complete Docker cleanup..."
        
        # Stop and remove all containers
        if [ "$(docker ps -aq)" ]; then
            docker stop $(docker ps -aq) 2>/dev/null || true
            docker rm $(docker ps -aq) 2>/dev/null || true
        fi
        
        # Remove all images
        if [ "$(docker images -aq)" ]; then
            docker rmi $(docker images -aq) 2>/dev/null || true
        fi
        
        # Clean up
        docker container prune -f 2>/dev/null || true
        docker image prune -af 2>/dev/null || true
        docker volume prune -f 2>/dev/null || true
        docker network prune -f 2>/dev/null || true
        
        log_success "Docker cleanup completed"
    else
        log_info "Skipping Docker cleanup"
        log_info "Stopping BiteTrack containers only..."
        docker compose down -v 2>/dev/null || true
    fi
}

configure_environment() {
    log_header "⚙️ PRODUCTION ENVIRONMENT CONFIGURATION"
    
    log_info "Setting up production environment variables..."
    
    # MongoDB Configuration
    echo ""
    echo -e "${BLUE}MongoDB Configuration:${NC}"
    prompt_user "MongoDB Username" "bitetrack-admin" "MONGO_USER"
    prompt_password "MongoDB Password (leave empty to generate secure password)" "MONGO_PASS"
    
    if [ -z "$MONGO_PASS" ]; then
        MONGO_PASS=$(generate_secure_secret)
        log_info "Generated secure MongoDB password: ${MONGO_PASS:0:8}..."
    fi
    
    prompt_user "MongoDB Database Name" "bitetrack" "MONGO_DB"
    
    # JWT Configuration
    echo ""
    echo -e "${BLUE}JWT Security Configuration:${NC}"
    JWT_SECRET=$(generate_secure_secret)
    log_info "Generated secure JWT secret: ${JWT_SECRET:0:12}..."
    
    prompt_user "JWT Token Expiration" "7d" "JWT_EXPIRES"
    
    # CORS Configuration
    echo ""
    echo -e "${BLUE}CORS Configuration:${NC}"
    log_info "Enter your frontend domain(s). Multiple domains can be comma-separated."
    log_info "Example: https://myapp.com,https://admin.myapp.com"
    prompt_user "Frontend URL(s)" "https://localhost:3000" "FRONTEND_URLS"
    
    # Application Configuration
    echo ""
    echo -e "${BLUE}Application Configuration:${NC}"
    prompt_user "Application Port" "3000" "APP_PORT"
    prompt_user "Log Level" "info" "LOG_LEVEL"
    
    # Create production environment file
    log_info "Creating $ENV_FILE..."
    
    cat > "$ENV_FILE" << EOF
NODE_ENV=production
PORT=$APP_PORT

# MongoDB Configuration - Production Values
# Connection string format (for API)
MONGO_URI=mongodb://$MONGO_USER:$MONGO_PASS@mongodb:27017/$MONGO_DB?authSource=admin&directConnection=true

# Separate credentials (for scripts and docker-compose)
MONGO_ROOT_USERNAME=$MONGO_USER
MONGO_ROOT_PASSWORD=$MONGO_PASS

# JWT Configuration - Production Secrets
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=$JWT_EXPIRES

# CORS Configuration - Production Frontend URLs
FRONTEND_URLS=$FRONTEND_URLS

# Production Settings
DEBUG=false
LOG_LEVEL=$LOG_LEVEL

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    
    log_success "Production environment configuration created"
    log_info "Configuration saved to: $ENV_FILE"
}

setup_keyfile() {
    log_header "🔐 MONGODB KEYFILE SETUP"
    
    log_info "Setting up MongoDB replica set keyfile..."
    ./scripts/01-setup-keyfile.sh
    log_success "MongoDB keyfile setup completed"
}

start_containers() {
    log_header "🐳 DOCKER CONTAINERS STARTUP"
    
    log_info "Starting BiteTrack production stack..."
    docker compose --env-file "$ENV_FILE" up -d
    
    log_info "Waiting for containers to be healthy..."
    sleep 10
    
    # Check container status
    if docker compose ps | grep -q "healthy"; then
        log_success "Containers started successfully"
    else
        log_error "Some containers may not be healthy"
        log_info "Container status:"
        docker compose ps
    fi
}

verify_system() {
    log_header "✅ SYSTEM HEALTH VERIFICATION"
    
    log_info "Running system health checks..."
    
    # Set environment variables for the health check
    export MONGO_ROOT_USERNAME="$MONGO_USER"
    export MONGO_ROOT_PASSWORD="$MONGO_PASS"
    
    ./scripts/02-quick-persistence-test.sh
    log_success "System health verification completed"
}

create_superadmin() {
    log_header "👤 SUPERADMIN USER CREATION"
    
    log_info "Creating initial SuperAdmin user..."
    echo ""
    echo -e "${BLUE}SuperAdmin Account Details:${NC}"
    
    prompt_user "First Name" "Production" "ADMIN_FIRST_NAME"
    prompt_user "Last Name" "Administrator" "ADMIN_LAST_NAME"
    prompt_user "Email" "admin@yourdomain.com" "ADMIN_EMAIL"
    prompt_user "Date of Birth (YYYY-MM-DD)" "1990-01-01" "ADMIN_DOB"
    prompt_password "Password" "ADMIN_PASSWORD"
    
    # Create superadmin using environment variables
    export ADMIN_FIRST_NAME
    export ADMIN_LAST_NAME  
    export ADMIN_EMAIL
    export ADMIN_DOB
    export ADMIN_PASSWORD
    export MONGO_ROOT_USERNAME="$MONGO_USER"
    export MONGO_ROOT_PASSWORD="$MONGO_PASS"
    
    ./scripts/03-create-superadmin.sh --non-interactive
    
    log_success "SuperAdmin user created successfully"
    log_info "Login credentials:"
    log_info "  Email: $ADMIN_EMAIL"
    log_info "  Password: [as entered]"
}

populate_test_data() {
    log_header "📊 TEST DATA POPULATION"
    
    if confirm_action "Do you want to populate the database with test data?"; then
        echo ""
        echo -e "${BLUE}Available presets:${NC}"
        echo "  minimal - Essential data (5 customers, 7 products, 3 sales)"
        echo "  dev     - Development dataset (10 customers, 14 products, 7 sales)"
        echo "  full    - Complete realistic dataset (~20 customers, ~35 products)"
        echo "  bulk    - Large dataset for performance testing"
        
        prompt_user "Select preset" "dev" "DATA_PRESET"
        
        log_info "Populating database with $DATA_PRESET dataset..."
        
        # Set MongoDB URI for Node.js script
        export MONGO_URI="mongodb://$MONGO_USER:$MONGO_PASS@localhost:27017/$MONGO_DB?authSource=admin&directConnection=true"
        
        node scripts/04-populate-test-data.js --preset="$DATA_PRESET" --verbose
        log_success "Test data population completed"
    else
        log_info "Skipping test data population"
    fi
}

run_comprehensive_tests() {
    log_header "🧪 COMPREHENSIVE TESTING"
    
    if confirm_action "Do you want to run comprehensive system tests?"; then
        log_info "Running data persistence tests..."
        
        export MONGO_ROOT_USERNAME="$MONGO_USER"
        export MONGO_ROOT_PASSWORD="$MONGO_PASS"
        
        ./scripts/05-test-data-persistence.sh --verbose
        
        log_info "Running API feature tests..."
        
        # Get authentication token
        JWT_TOKEN=$(curl -s -X POST "http://localhost:$APP_PORT/bitetrack/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | \
            jq -r '.token' 2>/dev/null || echo "")
        
        if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
            node scripts/06-test-sales-filtering.js --auth-token="$JWT_TOKEN" --verbose
        else
            log_warning "Could not obtain authentication token for API tests"
        fi
        
        log_success "Comprehensive testing completed"
    else
        log_info "Skipping comprehensive tests"
    fi
}

show_completion() {
    log_header "🎉 PRODUCTION SETUP COMPLETED"
    
    echo -e "${GREEN}BiteTrack production environment is now ready!${NC}"
    echo ""
    echo -e "${BLUE}📋 Setup Summary:${NC}"
    echo "  🌐 API URL: http://localhost:$APP_PORT"
    echo "  🍃 MongoDB: localhost:27017"
    echo "  👤 SuperAdmin: $ADMIN_EMAIL"
    echo "  📁 Environment: $ENV_FILE"
    echo ""
    echo -e "${BLUE}🔗 Quick Links:${NC}"
    echo "  Health Check: curl http://localhost:$APP_PORT/bitetrack/health"
    echo "  API Documentation: http://localhost:$APP_PORT/bitetrack/docs"
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "  1. Test the API endpoints using the SuperAdmin credentials"
    echo "  2. Configure your frontend to use: http://localhost:$APP_PORT"
    echo "  3. Set up reverse proxy (Nginx/Traefik) for production domain"
    echo "  4. Configure SSL/TLS certificates for HTTPS"
    echo ""
    echo -e "${BLUE}🛠️ Useful Commands:${NC}"
    echo "  View logs:    docker compose logs -f"
    echo "  Stop stack:   docker compose down"
    echo "  Restart:      docker compose --env-file $ENV_FILE up -d"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    show_welcome
    
    if ! confirm_action "Do you want to proceed with the production setup?"; then
        log_info "Setup cancelled by user"
        exit 0
    fi
    
    check_prerequisites
    docker_cleanup
    configure_environment
    setup_keyfile
    start_containers
    verify_system
    create_superadmin
    populate_test_data
    run_comprehensive_tests
    show_completion
}

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml not found"
    log_error "Please run this script from the BiteTrack project root directory"
    exit 1
fi

# Run main function
main "$@"