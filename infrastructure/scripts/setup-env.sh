#!/bin/bash

# BiteTrack Environment Configuration
# Generates .env.development and/or .env.production files at project root
#
# Usage: Called by init.sh with SETUP_MODE environment variable

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_MONGO_USER="bitetrack-admin"
DEFAULT_MONGO_DB="bitetrack"
DEFAULT_JWT_EXPIRATION="7d"
DEFAULT_LOG_LEVEL="info"
DEFAULT_FRONTEND_URLS="http://localhost:5000"

# Port defaults
DEFAULT_API_PORT_PROD="3000"
DEFAULT_MCP_PORT_PROD="4000"
DEFAULT_FRONTEND_PORT_PROD="5000"

DEFAULT_API_PORT_DEV="3001"
DEFAULT_MCP_PORT_DEV="4001"
DEFAULT_FRONTEND_PORT_DEV="5001"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
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

# Generate secure secret
generate_secure_secret() {
    openssl rand -base64 32 | tr -d '\n'
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

# Validate MongoDB password
validate_mongo_password() {
    local password="$1"
    
    if [ ${#password} -lt 8 ]; then
        log_error "Password must be at least 8 characters long"
        return 1
    fi
    
    if ! [[ "$password" =~ [A-Z] ]]; then
        log_error "Password must contain at least one uppercase letter"
        return 1
    fi
    
    if ! [[ "$password" =~ [a-z] ]]; then
        log_error "Password must contain at least one lowercase letter"
        return 1
    fi
    
    if ! [[ "$password" =~ [0-9] ]]; then
        log_error "Password must contain at least one digit"
        return 1
    fi
    
    return 0
}

# Collect configuration data
collect_config_data() {
    log_header "CONFIGURATION DATA"
    
    log_info "Please provide the following configuration information:"
    echo ""
    
    # MongoDB Configuration
    echo -e "${BLUE}MongoDB Configuration:${NC}"
    prompt_user "MongoDB Username" "$DEFAULT_MONGO_USER" "MONGO_USER"
    
    while true; do
        prompt_password "MongoDB Password (8+ chars, uppercase, lowercase, digit)" "MONGO_PASS"
        
        if [ -z "$MONGO_PASS" ]; then
            log_error "MongoDB password is required"
            continue
        fi
        
        if validate_mongo_password "$MONGO_PASS"; then
            MONGO_PASS_ENCODED=$(url_encode "$MONGO_PASS")
            log_success "Password validated successfully"
            break
        fi
    done
    
    prompt_user "MongoDB Database Name" "$DEFAULT_MONGO_DB" "MONGO_DB"
    
    # JWT Configuration
    echo ""
    echo -e "${BLUE}JWT Configuration:${NC}"
    JWT_SECRET=$(generate_secure_secret)
    log_info "Generated JWT secret: ${JWT_SECRET:0:12}..."
    
    prompt_user "JWT Token Expiration" "$DEFAULT_JWT_EXPIRATION" "JWT_EXPIRES"
    
    # GenAI API Key (optional)
    echo ""
    echo -e "${BLUE}MCP AI Configuration (Optional):${NC}"
    log_info "If you have a Google Gemini API key, enter it here."
    log_info "Leave empty to skip - you can add it to .env files later."
    prompt_user "Gemini API Key" "" "GEMINI_API_KEY"
    
    # Port Configuration
    echo ""
    echo -e "${BLUE}Port Configuration:${NC}"
    
    if [[ "$SETUP_MODE" == "prod" || "$SETUP_MODE" == "both" ]]; then
        echo "Production Ports:"
        prompt_user "  API Port" "$DEFAULT_API_PORT_PROD" "API_PORT_PROD"
        prompt_user "  MCP Port" "$DEFAULT_MCP_PORT_PROD" "MCP_PORT_PROD"
        prompt_user "  Frontend Port" "$DEFAULT_FRONTEND_PORT_PROD" "FRONTEND_PORT_PROD"
    fi
    
    if [[ "$SETUP_MODE" == "dev" || "$SETUP_MODE" == "both" ]]; then
        echo "Development Ports:"
        prompt_user "  API Port" "$DEFAULT_API_PORT_DEV" "API_PORT_DEV"
        prompt_user "  MCP Port" "$DEFAULT_MCP_PORT_DEV" "MCP_PORT_DEV"
        prompt_user "  Frontend Port" "$DEFAULT_FRONTEND_PORT_DEV" "FRONTEND_PORT_DEV"
    fi
    
    # CORS Configuration
    echo ""
    echo -e "${BLUE}CORS Configuration:${NC}"
    prompt_user "Frontend URLs (comma-separated)" "$DEFAULT_FRONTEND_URLS" "FRONTEND_URLS"
    
    log_success "Configuration data collected"
}

# Create production environment file
create_production_env() {
    log_info "Creating .env.production..."
    
    cat > "$PROJECT_ROOT/.env.production" << EOF
# BiteTrack Production Environment Configuration
# Generated on $(date)

NODE_ENV=production

# API Configuration
API_PORT=${API_PORT_PROD:-$DEFAULT_API_PORT_PROD}

# MCP Configuration
MCP_PORT=${MCP_PORT_PROD:-$DEFAULT_MCP_PORT_PROD}
GEMINI_API_KEY=${GEMINI_API_KEY}

# Frontend Configuration
FRONTEND_PORT=${FRONTEND_PORT_PROD:-$DEFAULT_FRONTEND_PORT_PROD}

# MongoDB Configuration
MONGO_ROOT_USERNAME=$MONGO_USER
MONGO_ROOT_PASSWORD=$MONGO_PASS
MONGO_DATABASE=$MONGO_DB
MONGO_URI=mongodb://$MONGO_USER:$MONGO_PASS_ENCODED@mongodb:27017/$MONGO_DB?authSource=admin&replicaSet=rs0

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=${JWT_EXPIRES:-$DEFAULT_JWT_EXPIRATION}

# CORS Configuration
FRONTEND_URLS=$FRONTEND_URLS

# Logging
LOG_LEVEL=${DEFAULT_LOG_LEVEL}

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    
    chmod 600 "$PROJECT_ROOT/.env.production"
    log_success "Created .env.production"
}

# Create development environment file
create_development_env() {
    log_info "Creating .env.development..."
    
    cat > "$PROJECT_ROOT/.env.development" << EOF
# BiteTrack Development Environment Configuration
# Generated on $(date)

NODE_ENV=development

# API Configuration
API_PORT=${API_PORT_DEV:-$DEFAULT_API_PORT_DEV}
PORT=${API_PORT_DEV:-$DEFAULT_API_PORT_DEV}

# MCP Configuration
MCP_PORT=${MCP_PORT_DEV:-$DEFAULT_MCP_PORT_DEV}
GEMINI_API_KEY=${GEMINI_API_KEY}

# Frontend Configuration
FRONTEND_PORT=${FRONTEND_PORT_DEV:-$DEFAULT_FRONTEND_PORT_DEV}

# MongoDB Configuration (connects to localhost for local development)
MONGO_ROOT_USERNAME=$MONGO_USER
MONGO_ROOT_PASSWORD=$MONGO_PASS
MONGO_DATABASE=$MONGO_DB
MONGO_URI=mongodb://$MONGO_USER:$MONGO_PASS_ENCODED@localhost:27017/$MONGO_DB?authSource=admin&directConnection=true

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=${JWT_EXPIRES:-$DEFAULT_JWT_EXPIRATION}

# CORS Configuration
FRONTEND_URLS=$FRONTEND_URLS

# Development Settings
DEBUG=true
LOG_LEVEL=debug

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Notes:
# - This file is for LOCAL development (services running outside Docker)
# - Uses localhost:27017 to connect to MongoDB in Docker
# - Production uses mongodb:27017 (Docker service name)
EOF
    
    chmod 600 "$PROJECT_ROOT/.env.development"
    log_success "Created .env.development"
}

# Create symlink for Docker Compose
create_env_symlink() {
    local target_env=""
    local env_filename=""
    
    if [[ "$SETUP_MODE" == "dev" ]]; then
        env_filename=".env.development"
    elif [[ "$SETUP_MODE" == "prod" || "$SETUP_MODE" == "both" ]]; then
        env_filename=".env.production"
    fi
    
    log_info "Creating symlink: infrastructure/.env -> ../$env_filename"
    
    # Remove existing .env or symlink in infrastructure directory
    rm -f "$PROJECT_ROOT/infrastructure/.env"
    
    # Create relative symlink
    cd "$PROJECT_ROOT/infrastructure"
    ln -sf "../$env_filename" .env
    cd "$PROJECT_ROOT"
    
    # Verify symlink was created
    if [ -L "$PROJECT_ROOT/infrastructure/.env" ]; then
        log_success "Symlink created: infrastructure/.env -> $env_filename"
    else
        log_error "Failed to create symlink"
        exit 1
    fi
}

# Create .secrets file
create_secrets_file() {
    log_info "Creating .secrets file..."
    
    cat > "$PROJECT_ROOT/.secrets" << EOF
# BiteTrack Secrets File
# Generated on $(date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# MongoDB Credentials
MONGO_USERNAME=$MONGO_USER
MONGO_PASSWORD=$MONGO_PASS

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Gemini API Key (if provided)
GEMINI_API_KEY=${GEMINI_API_KEY}

# Configuration
MONGO_DATABASE=$MONGO_DB
JWT_EXPIRES_IN=${JWT_EXPIRES:-$DEFAULT_JWT_EXPIRATION}

# Port Configuration
EOF
    
    if [[ "$SETUP_MODE" == "prod" || "$SETUP_MODE" == "both" ]]; then
        cat >> "$PROJECT_ROOT/.secrets" << EOF
API_PORT_PROD=${API_PORT_PROD:-$DEFAULT_API_PORT_PROD}
MCP_PORT_PROD=${MCP_PORT_PROD:-$DEFAULT_MCP_PORT_PROD}
FRONTEND_PORT_PROD=${FRONTEND_PORT_PROD:-$DEFAULT_FRONTEND_PORT_PROD}
EOF
    fi
    
    if [[ "$SETUP_MODE" == "dev" || "$SETUP_MODE" == "both" ]]; then
        cat >> "$PROJECT_ROOT/.secrets" << EOF
API_PORT_DEV=${API_PORT_DEV:-$DEFAULT_API_PORT_DEV}
MCP_PORT_DEV=${MCP_PORT_DEV:-$DEFAULT_MCP_PORT_DEV}
FRONTEND_PORT_DEV=${FRONTEND_PORT_DEV:-$DEFAULT_FRONTEND_PORT_DEV}
EOF
    fi
    
    chmod 600 "$PROJECT_ROOT/.secrets"
    log_success "Created .secrets file"
}

# Main execution
main() {
    log_header "ENVIRONMENT CONFIGURATION"
    
    # Check SETUP_MODE
    if [ -z "$SETUP_MODE" ]; then
        log_error "SETUP_MODE not set. This script should be called by init.sh"
        exit 1
    fi
    
    # Collect configuration
    collect_config_data
    
    # Create environment files based on mode
    case "$SETUP_MODE" in
        prod)
            create_production_env
            ;;
        dev)
            create_development_env
            ;;
        both)
            create_production_env
            create_development_env
            ;;
        *)
            log_error "Invalid SETUP_MODE: $SETUP_MODE"
            exit 1
            ;;
    esac
    
    # Create symlink for Docker Compose
    create_env_symlink
    
    # Create secrets file
    create_secrets_file
    
    log_success "Environment configuration complete"
}

main "$@"
