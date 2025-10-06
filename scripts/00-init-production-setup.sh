#!/bin/bash

# BiteTrack Production Setup Wizard
# Interactive script to set up BiteTrack from scratch for production deployment
# This script orchestrates all numbered scripts in the correct order

# Removed set -e for better error handling
# Now using step-level error handling with user interaction

# Ensure UTF-8 encoding for consistent character handling
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

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
    local debug_mode="${3:-false}"
    
    echo -ne "${YELLOW}$prompt${NC}: "
    if [ "$debug_mode" = "true" ]; then
        read -r user_input  # Visible for debugging
    else
        read -s user_input  # Hidden for production
    fi
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

# Enhanced error handling for step execution
execute_step() {
    local step_name="$1"
    local step_function="$2"
    local allow_skip="${3:-true}"  # Default to allowing skip
    
    while true; do
        log_step "Executing: $step_name"
        
        if $step_function; then
            log_success "$step_name completed successfully"
            return 0
        else
            local exit_code=$?
            log_error "$step_name failed with exit code $exit_code"
            
            echo ""
            echo -e "${YELLOW}What would you like to do?${NC}"
            if [ "$allow_skip" = "true" ]; then
                echo "  [r] Retry this step"
                echo "  [s] Skip this step and continue"
                echo "  [a] Abort setup"
                echo -ne "Choose an option [r/s/a]: "
            else
                echo "  [r] Retry this step"
                echo "  [a] Abort setup"
                echo -ne "Choose an option [r/a]: "
            fi
            
            read -r choice
            case "$choice" in
                [rR]|[rR][eE][tT][rR][yY])
                    continue  # Loop again to retry
                    ;;
                [sS]|[sS][kK][iI][pP])
                    if [ "$allow_skip" = "true" ]; then
                        log_warning "Skipping $step_name"
                        return 0
                    else
                        log_error "This step cannot be skipped"
                        continue
                    fi
                    ;;
                [aA]|[aA][bB][oO][rR][tT]|"")
                    log_error "Setup aborted by user"
                    exit 1
                    ;;
                *)
                    log_error "Invalid choice. Please select r, s, or a."
                    continue
                    ;;
            esac
        fi
    done
}

# Validate MongoDB password strength (relaxed for testing)
validate_mongo_password() {
    local password="$1"
    local errors=()
    
    # Check minimum length (relaxed to 8 characters)
    if [ ${#password} -lt 8 ]; then
        errors+=("Password must be at least 8 characters long")
    fi
    
    # Check for at least one uppercase letter
    if ! [[ "$password" =~ [A-Z] ]]; then
        errors+=("Password must contain at least one uppercase letter")
    fi
    
    # Check for at least one lowercase letter
    if ! [[ "$password" =~ [a-z] ]]; then
        errors+=("Password must contain at least one lowercase letter")
    fi
    
    # Check for at least one digit
    if ! [[ "$password" =~ [0-9] ]]; then
        errors+=("Password must contain at least one digit")
    fi
    
    # Special characters are now OPTIONAL for easier testing
    # Just warn about URL-problematic characters
    if [[ "$password" =~ [@#%\&\+=\?\[\]\s] ]]; then
        log_warning "Password contains characters that might cause URL encoding issues"
        log_warning "Consider avoiding: @ # % & + = ? [ ] (spaces)"
    fi
    
    if [ ${#errors[@]} -gt 0 ]; then
        log_error "Password validation failed:"
        for error in "${errors[@]}"; do
            echo -e "  ${RED}•${NC} $error"
        done
        echo ""
        echo -e "${BLUE}Password requirements (relaxed for testing):${NC}"
        echo -e "  • At least 8 characters long"
        echo -e "  • Contains uppercase and lowercase letters"
        echo -e "  • Contains at least one digit"
        echo -e "  • Special characters are optional"
        echo -e "  • Good examples: Password123, TestPass99, SimpleDB123"
        return 1
    fi
    
    return 0
}

generate_secure_secret() {
    openssl rand -base64 32 | tr -d '\n'
}

# Generate MongoDB-safe password (no URL-problematic characters)
# Removed auto-generation of MongoDB passwords - users must provide their own

# URL encode a string for MongoDB connection URI (bash-only implementation)
# Fixed to properly handle % characters in environment files
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
                # Convert to hex and add % prefix
                # Use printf to get the hex value properly
                printf -v hex '%02X' "'$char"
                encoded+="%$hex"
                ;;
        esac
    done
    echo "$encoded"
}

# Alternative: Use single quotes in environment file to prevent bash interpretation
create_quoted_mongo_uri() {
    local user="$1"
    local encoded_pass="$2"
    local db="$3"
    # Return the URI in single quotes to prevent bash interpretation
    echo "'mongodb://$user:$encoded_pass@mongodb:27017/$db?authSource=admin&directConnection=true'"
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
    echo "  🧽 0. Clean environment variables to prevent conflicts"
    echo "  📋 1. Clean up Docker environment (BiteTrack-only or complete cleanup)"
    echo "  🔧 2. Configure production environment variables"
    echo "  🔐 3. Generate MongoDB keyfile"
    echo "  🐳 4. Start Docker containers"
    echo "  ✅ 5. Verify system health"
    echo "  👤 6. Create SuperAdmin user"
    echo "  🔐 7. Generate .secrets file with all credentials"
    echo "  🔗 8. Create .env symlink for Docker Compose"
    echo "  📊 9. Populate test data (optional)"
    echo "  🧪 10. Run comprehensive tests"
    echo ""
}

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        echo "Please install Docker and try again."
        return 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        echo "Please install Docker Compose and try again."
        return 1
    fi
    
    # Check required tools
    for tool in openssl curl jq; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed"
            echo "Please install $tool and try again."
            return 1
        fi
    done
    
    log_success "All prerequisites are available"
    return 0
}

docker_cleanup() {
    log_header "🧹 DOCKER CLEANUP"
    
    echo -e "${BLUE}Cleanup Options:${NC}"
    echo "  1. BiteTrack only - Stop and remove BiteTrack containers/volumes"
    echo "  2. Complete cleanup - Remove ALL Docker containers, images, volumes"
    echo "  3. Skip cleanup"
    echo ""
    echo -ne "${YELLOW}Select cleanup option [1/2/3]:${NC} "
    read -r cleanup_choice
    
    case "$cleanup_choice" in
        1)
            log_info "Cleaning up BiteTrack containers only..."
            docker compose down -v 2>/dev/null || true
            log_success "BiteTrack cleanup completed"
            return 0
            ;;
        2)
            log_warning "⚠️  COMPLETE DOCKER CLEANUP SELECTED ⚠️"
            log_warning "This will remove ALL Docker containers, images, and volumes."
            log_warning "This affects ALL projects on your system, not just BiteTrack."
            echo ""
            if confirm_action "Are you absolutely sure you want to proceed?"; then
                log_info "Performing comprehensive Docker cleanup..."
                
                # Use the comprehensive cleanup command
                if docker stop $(docker ps -aq) 2>/dev/null && \
                   docker rm $(docker ps -aq) 2>/dev/null && \
                   docker rmi $(docker images -aq) 2>/dev/null && \
                   docker container prune -f 2>/dev/null && \
                   docker compose down -v 2>/dev/null && \
                   docker volume prune -f 2>/dev/null; then
                    log_success "Complete Docker cleanup completed"
                else
                    log_warning "Some cleanup operations may have failed (this is normal if no containers/images existed)"
                fi
                
                # Clean up any lingering Docker environment variables
                log_info "Cleaning Docker-related environment variables..."
                unset COMPOSE_FILE COMPOSE_PROJECT_NAME DOCKER_BUILDKIT
                
                return 0
            else
                log_info "Complete cleanup cancelled, performing BiteTrack-only cleanup..."
                docker compose down -v 2>/dev/null || true
                return 0
            fi
            ;;
        3|"")
            log_info "Skipping Docker cleanup"
            return 0
            ;;
        *)
            log_error "Invalid option. Skipping cleanup."
            return 0
            ;;
    esac
}

configure_environment() {
    log_header "⚙️ PRODUCTION ENVIRONMENT CONFIGURATION"
    
    log_info "Setting up production environment variables..."
    
    # MongoDB Configuration
    echo ""
    echo -e "${BLUE}MongoDB Configuration:${NC}"
    prompt_user "MongoDB Username" "bitetrack-admin" "MONGO_USER"
    
    # Require strong password with validation
    while true; do
        prompt_password "MongoDB Password (required - will be validated)" "MONGO_PASS"
        
        if [ -z "$MONGO_PASS" ]; then
            log_error "MongoDB password is required for production deployment"
            continue
        fi
        
        if validate_mongo_password "$MONGO_PASS"; then
            # URL encode the password to handle special characters
            MONGO_PASS_ENCODED=$(url_encode "$MONGO_PASS")
            log_success "Password validated and encoded successfully"
            break
        else
            echo ""
            log_info "Please enter a stronger password that meets the requirements above."
        fi
    done
    
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
    
    # Create the MongoDB URI with proper quoting to handle special characters
    QUOTED_MONGO_URI=$(create_quoted_mongo_uri "$MONGO_USER" "$MONGO_PASS_ENCODED" "$MONGO_DB")
    
    cat > "$ENV_FILE" << EOF
NODE_ENV=production
PORT=$APP_PORT

# MongoDB Configuration - Production Values
# Connection string format (for API) - using URL-encoded password (quoted to handle special chars)
MONGO_URI=$QUOTED_MONGO_URI

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
    return 0
}

setup_keyfile() {
    log_header "🔐 MONGODB KEYFILE SETUP"
    
    log_info "Setting up MongoDB replica set keyfile..."
    if ./scripts/01-setup-keyfile.sh; then
        log_success "MongoDB keyfile setup completed"
        return 0
    else
        log_error "MongoDB keyfile setup failed"
        return 1
    fi
}

start_containers() {
    log_header "🐳 DOCKER CONTAINERS STARTUP"
    
    # Double-check environment is clean before starting
    if [ -n "$MONGO_ROOT_PASSWORD" ] && [ "$MONGO_ROOT_PASSWORD" != "$MONGO_PASS" ]; then
        log_warning "Environment variable mismatch detected - cleaning..."
        unset MONGO_ROOT_PASSWORD MONGO_ROOT_USERNAME MONGO_USER MONGO_PASS
    fi
    
    # Validate environment file contains our credentials
    log_info "Validating environment configuration..."
    if ! grep -q "MONGO_ROOT_USERNAME=$MONGO_USER" "$ENV_FILE"; then
        log_error "Environment file validation failed - MongoDB username mismatch"
        log_error "Expected: $MONGO_USER, but file contains: $(grep MONGO_ROOT_USERNAME $ENV_FILE)"
        return 1
    fi
    
    if ! grep -q "MONGO_ROOT_PASSWORD=$MONGO_PASS" "$ENV_FILE"; then
        log_error "Environment file validation failed - MongoDB password mismatch"
        return 1
    fi
    
    log_success "Environment file validation passed"
    log_info "MongoDB Username: $MONGO_USER"
    log_info "MongoDB Database: $MONGO_DB"
    
    log_info "Starting BiteTrack production stack with environment file: $ENV_FILE"
    
    # Ensure we're using the correct environment file explicitly
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        return 1
    fi
    
    # Warn if conflicting environment files exist
    if [ -f ".env.development" ] && [ "$ENV_FILE" != ".env.development" ]; then
        log_warning "Multiple environment files detected - using: $ENV_FILE"
    fi
    
    # Final verification: show what credentials Docker Compose will receive
    log_info "Docker Compose will use these credentials from $ENV_FILE:"
    log_info "  MONGO_ROOT_USERNAME: $(grep '^MONGO_ROOT_USERNAME=' $ENV_FILE | cut -d'=' -f2)"
    log_info "  MONGO_ROOT_PASSWORD: [REDACTED - $(echo $MONGO_PASS | cut -c1-3)]***"
    
    if ! docker compose --env-file "$ENV_FILE" up -d; then
        log_error "Failed to start Docker containers"
        return 1
    fi
    
    log_info "Waiting for containers to be healthy..."
    sleep 10
    
    # Check container status
    if docker compose ps | grep -q "healthy"; then
        log_success "Containers started successfully"
        return 0
    else
        log_error "Some containers may not be healthy"
        log_info "Container status:"
        docker compose ps
        return 1
    fi
}

verify_system() {
    log_header "✅ SYSTEM HEALTH VERIFICATION"
    
    log_info "Running system health checks..."
    log_info "Waiting for API to be fully ready..."
    sleep 5  # Give API time to fully initialize
    
    # Set environment variables for the health check
    export MONGO_ROOT_USERNAME="$MONGO_USER"
    export MONGO_ROOT_PASSWORD="$MONGO_PASS"
    
    if ./scripts/02-quick-persistence-test.sh; then
        log_success "System health verification completed"
        return 0
    else
        log_error "System health verification failed"
        return 1
    fi
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
    
    if ./scripts/03-create-superadmin.sh --non-interactive; then
        log_success "SuperAdmin user created successfully"
        log_info "Login credentials:"
        log_info "  Email: $ADMIN_EMAIL"
        log_info "  Password: [as entered]"
        return 0
    else
        log_error "SuperAdmin user creation failed"
        return 1
    fi
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
        
        # Set MongoDB URI for Node.js script (using URL-encoded password)
        export MONGO_URI="mongodb://$MONGO_USER:$MONGO_PASS_ENCODED@localhost:27017/$MONGO_DB?authSource=admin&directConnection=true"
        
        if node scripts/04-populate-test-data.js --preset="$DATA_PRESET" --verbose; then
            log_success "Test data population completed"
            return 0
        else
            log_error "Test data population failed"
            return 1
        fi
    else
        log_info "Skipping test data population"
        return 0
    fi
}

run_comprehensive_tests() {
    log_header "🧪 COMPREHENSIVE TESTING"
    
    if confirm_action "Do you want to run comprehensive system tests?"; then
        log_info "Running data persistence tests..."
        
        export MONGO_ROOT_USERNAME="$MONGO_USER"
        export MONGO_ROOT_PASSWORD="$MONGO_PASS"
        
        if ! ./scripts/05-test-data-persistence.sh --verbose; then
            log_error "Data persistence tests failed"
            return 1
        fi
        
        log_info "Running API feature tests..."
        
        # Get authentication token
        JWT_TOKEN=$(curl -s -X POST "http://localhost:$APP_PORT/bitetrack/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | \
            jq -r '.token' 2>/dev/null || echo "")
        
        if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
            if ! node scripts/06-test-sales-filtering.js --auth-token="$JWT_TOKEN" --verbose; then
                log_warning "API feature tests failed, but continuing..."
            fi
        else
            log_warning "Could not obtain authentication token for API tests"
        fi
        
        log_success "Comprehensive testing completed"
        return 0
    else
        log_info "Skipping comprehensive tests"
        return 0
    fi
}

create_secrets_file() {
    log_header "🔐 CREATING SECRETS FILE"
    
    local secrets_file=".secrets"
    
    # Backup existing secrets file if it exists
    if [ -f "$secrets_file" ]; then
        local backup_file=".secrets.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$secrets_file" "$backup_file"
        log_info "Existing secrets file backed up to: $backup_file"
    fi
    
    log_info "Generating secure credentials file..."
    
    cat > "$secrets_file" << EOF
# BiteTrack Secrets File
# DO NOT COMMIT THIS FILE TO VERSION CONTROL
# This file contains sensitive credentials for the BiteTrack application

# Production Environment Configuration
ENVIRONMENT=production
CREATED_BY_SCRIPT=true

# SuperAdmin User Credentials
SUPERADMIN_EMAIL=$ADMIN_EMAIL
SUPERADMIN_PASSWORD=$ADMIN_PASSWORD
SUPERADMIN_FIRST_NAME=$ADMIN_FIRST_NAME
SUPERADMIN_LAST_NAME=$ADMIN_LAST_NAME
SUPERADMIN_DOB=$ADMIN_DOB
SUPERADMIN_ROLE=superadmin

# MongoDB Database Credentials
MONGO_ROOT_USERNAME=$MONGO_USER
MONGO_ROOT_PASSWORD=$MONGO_PASS
MONGO_DATABASE=$MONGO_DB
MONGO_URI_ENCODED='$QUOTED_MONGO_URI'

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=$JWT_EXPIRES

# Application Configuration
APP_PORT=$APP_PORT
FRONTEND_URLS=$FRONTEND_URLS
LOG_LEVEL=$LOG_LEVEL

# Quick Test Commands
# Test API Health:
# curl http://localhost:$APP_PORT/bitetrack/health
#
# Test Login:
# curl -X POST http://localhost:$APP_PORT/bitetrack/auth/login \\
#   -H "Content-Type: application/json" \\
#   -d '{"email":"$ADMIN_EMAIL","password":"YOUR_PASSWORD"}'

# Created: $(date)
# Environment File: $ENV_FILE
# MongoDB Connection: localhost:27017
EOF

    # Set secure permissions
    chmod 600 "$secrets_file"
    
    log_success "Secrets file created: $secrets_file"
    log_info "File permissions set to 600 (owner read/write only)"
    
    # Add to .gitignore if not already present
    if [ -f ".gitignore" ]; then
        if ! grep -q ".secrets" ".gitignore"; then
            echo "" >> .gitignore
            echo "# Secrets file (contains sensitive credentials)" >> .gitignore
            echo ".secrets" >> .gitignore
            echo ".secrets.backup.*" >> .gitignore
            log_info "Added .secrets to .gitignore"
        else
            log_info ".secrets already in .gitignore"
        fi
    else
        log_warning ".gitignore not found - create one to prevent committing secrets"
    fi
}

create_environment_symlink() {
    log_header "🔗 ENVIRONMENT SYMLINK SETUP"
    
    log_info "Setting up default environment symlink for Docker Compose..."
    
    # Check if .env already exists
    if [ -f ".env" ]; then
        # Check if it's already a symlink to our environment file
        if [ -L ".env" ] && [ "$(readlink .env)" = "$ENV_FILE" ]; then
            log_success ".env symlink already points to $ENV_FILE"
            return 0
        fi
        
        # Backup existing .env file
        local backup_file=".env.backup.$(date +%Y%m%d_%H%M%S)"
        mv ".env" "$backup_file"
        log_info "Existing .env file backed up to: $backup_file"
    fi
    
    # Create symlink to our environment file
    ln -sf "$ENV_FILE" ".env"
    
    log_success "Created .env symlink pointing to $ENV_FILE"
    log_info "This eliminates Docker Compose warnings about missing environment variables"
    
    # Add .env to .gitignore if not already present (since it's a symlink to production data)
    if [ -f ".gitignore" ]; then
        if ! grep -q "^\.env$" ".gitignore"; then
            echo "" >> .gitignore
            echo "# Environment symlink (points to production config)" >> .gitignore
            echo ".env" >> .gitignore
            echo ".env.backup.*" >> .gitignore
            log_info "Added .env to .gitignore"
        else
            log_info ".env already in .gitignore"
        fi
    fi
    
    # Verify symlink works
    if docker compose config > /dev/null 2>&1; then
        log_success "Docker Compose can now read environment variables without warnings"
    else
        log_warning "Docker Compose config validation failed - check your environment file"
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
    echo "  🔗 Symlink: .env -> $ENV_FILE"
    echo "  🔐 Secrets: .secrets (secure credentials)"
    echo ""
    echo -e "${BLUE}🔗 Quick Links:${NC}"
    echo "  Health Check: curl http://localhost:$APP_PORT/bitetrack/health"
    echo "  API Documentation: http://localhost:$APP_PORT/bitetrack/docs"
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "  1. Test the API endpoints using credentials in .secrets file"
    echo "  2. Configure your frontend to use: http://localhost:$APP_PORT"
    echo "  3. Set up reverse proxy (Nginx/Traefik) for production domain"
    echo "  4. Configure SSL/TLS certificates for HTTPS"
    echo ""
    echo -e "${BLUE}🔐 Security Notes:${NC}"
    echo "  • .secrets file contains all sensitive credentials"
    echo "  • File is set to 600 permissions (owner access only)"
    echo "  • Added to .gitignore to prevent accidental commits"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "  View logs:    docker compose logs -f"
    echo "  Stop stack:   docker compose down"
    echo "  Restart:      docker compose up -d  (no --env-file needed thanks to .env symlink)"
    echo "  Alternative:  docker compose --env-file $ENV_FILE up -d"
    echo "  View secrets: cat .secrets"
    echo ""
    echo -e "${BLUE}🔧 Troubleshooting:${NC}"
    echo "  If you experience authentication issues, clean environment and restart:"
    echo "  unset MONGO_ROOT_PASSWORD MONGO_ROOT_USERNAME && docker compose down -v"
    echo "  Then re-run: docker compose --env-file $ENV_FILE up -d"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution with enhanced error handling
main() {
    show_welcome
    
    if ! confirm_action "Do you want to proceed with the production setup?"; then
        log_info "Setup cancelled by user"
        exit 0
    fi
    
    # Execute each step with error handling
    execute_step "Prerequisites Check" "check_prerequisites" false
    execute_step "Docker Cleanup" "docker_cleanup" true
    execute_step "Environment Configuration" "configure_environment" false
    execute_step "MongoDB Keyfile Setup" "setup_keyfile" false
    execute_step "Docker Containers Startup" "start_containers" false
    execute_step "System Health Verification" "verify_system" false
    execute_step "SuperAdmin User Creation" "create_superadmin" false
    execute_step "Secrets File Creation" "create_secrets_file" false
    execute_step "Environment Symlink Setup" "create_environment_symlink" false
    execute_step "Test Data Population" "populate_test_data" true
    execute_step "Comprehensive Testing" "run_comprehensive_tests" true
    
    show_completion
}

# Environment variable hygiene - clean potentially conflicting variables
clean_environment() {
    log_info "Cleaning potentially conflicting environment variables..."
    
    # List of variables that might conflict with our setup
    local vars_to_clean=(
        "MONGO_ROOT_USERNAME"
        "MONGO_ROOT_PASSWORD" 
        "MONGO_USER"
        "MONGO_PASS"
        "MONGO_URI"
        "JWT_SECRET"
        "ADMIN_EMAIL"
        "ADMIN_PASSWORD"
        "ADMIN_FIRST_NAME"
        "ADMIN_LAST_NAME"
        "ADMIN_DOB"
    )
    
    local found_conflicts=false
    
    for var in "${vars_to_clean[@]}"; do
        if [ -n "${!var}" ]; then
            if [ "$found_conflicts" = false ]; then
                echo ""
                log_warning "Found existing environment variables that may interfere:"
                found_conflicts=true
            fi
            echo "  • $var=${!var:0:10}..."
            unset "$var"
        fi
    done
    
    if [ "$found_conflicts" = true ]; then
        log_info "Cleaned conflicting environment variables"
        echo ""
    else
        log_success "No conflicting environment variables found"
    fi
}

# Diagnostic function for troubleshooting environment issues
diagnose_environment() {
    echo -e "${BLUE}🔍 Environment Diagnostics:${NC}"
    echo "==========================="
    
    echo -e "\n${CYAN}Current Environment Variables:${NC}"
    env | grep -E "(MONGO|JWT|ADMIN)" | sort || echo "No relevant environment variables found"
    
    echo -e "\n${CYAN}Environment File Contents:${NC}"
    if [ -f "$ENV_FILE" ]; then
        echo "File: $ENV_FILE"
        grep -E "(MONGO|JWT)" "$ENV_FILE" | head -10
    else
        echo "No environment file found at: $ENV_FILE"
    fi
    
    echo -e "\n${CYAN}Docker Container Environment:${NC}"
    if docker ps | grep -q "bitetrack-mongodb"; then
        echo "MongoDB Container:"
        docker exec bitetrack-mongodb env | grep MONGO_INITDB || echo "Container not accessible"
    else
        echo "MongoDB container not running"
    fi
    
    if docker ps | grep -q "bitetrack-api"; then
        echo "API Container:"
        docker exec bitetrack-api env | grep MONGO_URI || echo "Container not accessible"
    else
        echo "API container not running"
    fi
    
    echo "==========================="
}

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml not found"
    log_error "Please run this script from the BiteTrack project root directory"
    exit 1
fi

# Clean environment before starting
clean_environment

# Run main function
main "$@"