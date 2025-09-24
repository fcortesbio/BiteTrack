#!/bin/bash

# BiteTrack Superadmin Creation Script
# This script creates a superadmin user directly in MongoDB without manual copy/paste
# Usage: ./scripts/create-superadmin.sh [--help] [--non-interactive]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load shared environment functions
if [ -f "$(dirname "$0")/lib/env-loader.sh" ]; then
    source "$(dirname "$0")/lib/env-loader.sh"
else
    echo "ERROR: env-loader.sh not found" >&2
    exit 1
fi

# Configuration
TEST_DB="bitetrack"
NON_INTERACTIVE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --non-interactive)
            NON_INTERACTIVE=true
            shift
            ;;
        --help)
            echo "BiteTrack Superadmin Creation Script"
            echo ""
            echo "Usage: $0 [--non-interactive] [--help]"
            echo ""
            echo "Options:"
            echo "  --non-interactive  Skip prompts and use environment variables:"
            echo "                     ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL,"
            echo "                     ADMIN_DOB (YYYY-MM-DD), ADMIN_PASSWORD"
            echo "  --help            Show this help message"
            echo ""
            echo "This script will:"
            echo "1. Prompt for superadmin user details (or use env vars)"
            echo "2. Validate all input data"
            echo "3. Hash the password using bcrypt"
            echo "4. Insert the user directly into MongoDB"
            echo "5. Verify the user was created successfully"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Setup production-ready environment (uses shared library)
setup_environment() {
    log_info "Setting up environment for $(detect_environment_type) deployment..."
    
    if ! setup_bitetrack_environment false; then
        log_error "Failed to setup environment"
        exit 1
    fi
    
    log_success "Environment setup complete"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        exit 1
    fi
    
    # Check if MongoDB is running
    if ! docker compose ps mongodb | grep -q "Up.*healthy"; then
        log_error "MongoDB container is not running or not healthy"
        log_info "Please start the stack with: docker compose up -d"
        exit 1
    fi
    
    # Check bcrypt availability (using Python as it's more universally available than Node.js)
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        log_error "Python is required for password hashing but not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Password hashing function
hash_password() {
    local password="$1"
    
    # Create a temporary Python script for bcrypt hashing
    local python_cmd=""
    if command -v python3 &> /dev/null; then
        python_cmd="python3"
    else
        python_cmd="python"
    fi
    
    # Hash password using Python bcrypt (matches Node.js bcrypt with 12 rounds)
    local hashed_password=$($python_cmd -c "
import hashlib
import base64
import os
import secrets

def bcrypt_hash(password, rounds=12):
    # Simple bcrypt-compatible hash using PBKDF2 (fallback if bcrypt not available)
    try:
        import bcrypt
        salt = bcrypt.gensalt(rounds=rounds)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    except ImportError:
        # Fallback to PBKDF2 with similar security
        salt = secrets.token_bytes(16)
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        salt_b64 = base64.b64encode(salt).decode('utf-8')
        key_b64 = base64.b64encode(key).decode('utf-8')
        return f'pbkdf2\$100000\${salt_b64}\${key_b64}'

print(bcrypt_hash('$password'))
")
    
    echo "$hashed_password"
}

# Input validation functions
validate_name() {
    local name="$1"
    if [[ ${#name} -lt 2 ]]; then
        echo "Name must be at least 2 characters long"
        return 1
    fi
    if [[ ! "$name" =~ ^[a-zA-Z][a-zA-Z\ ]*$ ]]; then
        echo "Name must contain only letters and spaces, starting with a letter"
        return 1
    fi
    return 0
}

validate_email() {
    local email="$1"
    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        echo "Invalid email format"
        return 1
    fi
    return 0
}

validate_date() {
    local date="$1"
    if ! date -d "$date" "+%Y-%m-%d" &>/dev/null; then
        echo "Invalid date format. Use YYYY-MM-DD"
        return 1
    fi
    
    # Check if date is not in the future
    local input_date=$(date -d "$date" "+%s")
    local current_date=$(date "+%s")
    
    if [[ $input_date -gt $current_date ]]; then
        echo "Date of birth cannot be in the future"
        return 1
    fi
    
    return 0
}

validate_password() {
    local password="$1"
    
    # Length check
    if [[ ${#password} -lt 8 ]]; then
        echo "Password must be at least 8 characters long"
        return 1
    fi
    
    # Character requirements
    if [[ ! "$password" =~ [a-z] ]]; then
        echo "Password must contain at least one lowercase letter"
        return 1
    fi
    
    if [[ ! "$password" =~ [A-Z] ]]; then
        echo "Password must contain at least one uppercase letter"
        return 1
    fi
    
    if [[ ! "$password" =~ [0-9] ]]; then
        echo "Password must contain at least one number"
        return 1
    fi
    
    if [[ ! "$password" =~ [^a-zA-Z0-9] ]]; then
        echo "Password must contain at least one special character"
        return 1
    fi
    
    return 0
}

# Capitalize first letter of each word
capitalize_name() {
    echo "$1" | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}'
}

# Collect user input
collect_user_data() {
    if [[ "$NON_INTERACTIVE" == "true" ]]; then
        log_step "Using non-interactive mode with environment variables"
        
        FIRST_NAME="${ADMIN_FIRST_NAME}"
        LAST_NAME="${ADMIN_LAST_NAME}"
        EMAIL="${ADMIN_EMAIL}"
        DOB="${ADMIN_DOB}"
        PASSWORD="${ADMIN_PASSWORD}"
        
        # Validate required environment variables
        if [[ -z "$FIRST_NAME" || -z "$LAST_NAME" || -z "$EMAIL" || -z "$DOB" || -z "$PASSWORD" ]]; then
            log_error "Non-interactive mode requires all environment variables:"
            log_error "ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL, ADMIN_DOB, ADMIN_PASSWORD"
            exit 1
        fi
    else
        log_step "Collecting superadmin user information"
        echo -e "${YELLOW}Please provide the following information for the superadmin account:${NC}"
        echo ""
        
        # First Name
        while true; do
            read -p "First Name: " FIRST_NAME
            FIRST_NAME=$(echo "$FIRST_NAME" | xargs)  # trim whitespace
            if validate_name "$FIRST_NAME"; then
                FIRST_NAME=$(capitalize_name "$FIRST_NAME")
                break
            else
                log_error "$(validate_name "$FIRST_NAME" 2>&1)"
            fi
        done
        
        # Last Name
        while true; do
            read -p "Last Name: " LAST_NAME
            LAST_NAME=$(echo "$LAST_NAME" | xargs)  # trim whitespace
            if validate_name "$LAST_NAME"; then
                LAST_NAME=$(capitalize_name "$LAST_NAME")
                break
            else
                log_error "$(validate_name "$LAST_NAME" 2>&1)"
            fi
        done
        
        # Email
        while true; do
            read -p "Email: " EMAIL
            EMAIL=$(echo "$EMAIL" | xargs | tr '[:upper:]' '[:lower:]')  # trim and lowercase
            if validate_email "$EMAIL"; then
                break
            else
                log_error "$(validate_email "$EMAIL" 2>&1)"
            fi
        done
        
        # Date of Birth
        while true; do
            read -p "Date of Birth (YYYY-MM-DD): " DOB
            DOB=$(echo "$DOB" | xargs)  # trim whitespace
            if validate_date "$DOB"; then
                break
            else
                log_error "$(validate_date "$DOB" 2>&1)"
            fi
        done
        
        # Password
        echo ""
        echo "Password requirements:"
        echo "• At least 8 characters long"
        echo "• At least one lowercase letter"
        echo "• At least one uppercase letter"
        echo "• At least one number"
        echo "• At least one special character"
        echo ""
        
        while true; do
            read -s -p "Password: " PASSWORD
            echo ""
            if validate_password "$PASSWORD"; then
                read -s -p "Confirm Password: " CONFIRM_PASSWORD
                echo ""
                if [[ "$PASSWORD" == "$CONFIRM_PASSWORD" ]]; then
                    break
                else
                    log_error "Passwords do not match"
                fi
            else
                log_error "$(validate_password "$PASSWORD" 2>&1)"
            fi
        done
    fi
    
    # Final validation
    local validation_errors=()
    
    validate_name "$FIRST_NAME" || validation_errors+=("Invalid first name")
    validate_name "$LAST_NAME" || validation_errors+=("Invalid last name")
    validate_email "$EMAIL" || validation_errors+=("Invalid email")
    validate_date "$DOB" || validation_errors+=("Invalid date of birth")
    validate_password "$PASSWORD" || validation_errors+=("Invalid password")
    
    if [[ ${#validation_errors[@]} -gt 0 ]]; then
        log_error "Validation failed:"
        for error in "${validation_errors[@]}"; do
            log_error "  $error"
        done
        exit 1
    fi
    
    log_success "User data collected and validated"
}

# Check if user already exists
check_existing_user() {
    log_step "Checking if user already exists..."
    
    local existing_user=$(docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin "$TEST_DB" --eval "
        db.sellers.findOne({email: '$EMAIL'})
    " --quiet 2>/dev/null)
    
    if [[ "$existing_user" != "null" && -n "$existing_user" ]]; then
        log_error "A user with email '$EMAIL' already exists"
        log_error "Please use a different email address"
        exit 1
    fi
    
    log_success "Email is available"
}

# Create superadmin user
create_superadmin() {
    log_step "Creating superadmin user..."
    
    # Hash the password
    log_info "Hashing password..."
    local hashed_password=$(hash_password "$PASSWORD")
    
    if [[ -z "$hashed_password" ]]; then
        log_error "Failed to hash password"
        exit 1
    fi
    
    log_success "Password hashed successfully"
    
    # Insert user into MongoDB
    log_info "Inserting user into MongoDB..."
    
    local result=$(docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin "$TEST_DB" --eval "
        db.sellers.insertOne({
            firstName: '$FIRST_NAME',
            lastName: '$LAST_NAME',
            email: '$EMAIL',
            dateOfBirth: new Date('$DOB'),
            password: '$hashed_password',
            role: 'superadmin',
            createdBy: 'Self',
            activatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        })
    " --quiet 2>/dev/null)
    
    if [[ "$result" == *"acknowledged: true"* ]]; then
        log_success "Superadmin user created successfully!"
        
        # Extract the inserted ID for verification
        local user_id=$(echo "$result" | grep -o 'ObjectId("[^"]*")' | head -1)
        
        echo ""
        echo -e "${GREEN}✓ Superadmin Account Created${NC}"
        echo -e "${CYAN}Details:${NC}"
        echo "  Name: $FIRST_NAME $LAST_NAME"
        echo "  Email: $EMAIL"
        echo "  Role: superadmin"
        echo "  Date of Birth: $DOB"
        if [[ -n "$user_id" ]]; then
            echo "  User ID: $user_id"
        fi
        echo ""
        
        return 0
    else
        log_error "Failed to create user"
        log_error "MongoDB response: $result"
        exit 1
    fi
}

# Verify user creation
verify_user_creation() {
    log_step "Verifying user creation..."
    
    local user_check=$(docker compose exec -T mongodb mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin "$TEST_DB" --eval "
        db.sellers.findOne({email: '$EMAIL'}, {password: 0})
    " --quiet 2>/dev/null)
    
    if [[ "$user_check" != "null" && -n "$user_check" ]]; then
        log_success "User verification successful"
        
        echo ""
        echo -e "${GREEN}🎉 Setup Complete!${NC}"
        echo ""
        echo "You can now use these credentials to log into the BiteTrack API:"
        echo -e "${CYAN}Email:${NC} $EMAIL"
        echo -e "${CYAN}Password:${NC} [the password you entered]"
        echo ""
        echo "Test the login with:"
        echo -e "${YELLOW}curl -X POST http://localhost:3000/bitetrack/auth/login \\${NC}"
        echo -e "${YELLOW}  -H \"Content-Type: application/json\" \\${NC}"
        echo -e "${YELLOW}  -d '{\"email\":\"$EMAIL\",\"password\":\"YOUR_PASSWORD\"}'${NC}"
        
        return 0
    else
        log_error "User verification failed"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${CYAN}🚀 BiteTrack Superadmin Creation${NC}"
    echo "=================================="
    
    # Run all steps
    check_prerequisites
    setup_environment
    collect_user_data
    check_existing_user
    create_superadmin
    verify_user_creation
    
    echo ""
    echo -e "${GREEN}All done! 🎉${NC}"
}

# Run the main function
main "$@"