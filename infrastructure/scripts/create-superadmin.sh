#!/bin/bash

# Create SuperAdmin User
# Creates initial superadmin user in MongoDB
#
# Usage: Called by init.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_DB="bitetrack"

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

# Validate inputs
validate_name() {
    local name="$1"
    if [[ ${#name} -lt 2 ]]; then
        return 1
    fi
    return 0
}

validate_email() {
    local email="$1"
    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

validate_date() {
    local date="$1"
    if ! date -d "$date" "+%Y-%m-%d" &>/dev/null; then
        return 1
    fi
    return 0
}

validate_password() {
    local password="$1"
    
    if [[ ${#password} -lt 8 ]]; then
        return 1
    fi
    
    if [[ ! "$password" =~ [a-z] ]]; then
        return 1
    fi
    
    if [[ ! "$password" =~ [A-Z] ]]; then
        return 1
    fi
    
    if [[ ! "$password" =~ [0-9] ]]; then
        return 1
    fi
    
    if [[ ! "$password" =~ [^a-zA-Z0-9] ]]; then
        return 1
    fi
    
    return 0
}

# Hash password using Python bcrypt
hash_password() {
    local password="$1"
    
    local python_cmd="python3"
    if ! command -v python3 &> /dev/null; then
        python_cmd="python"
    fi
    
    local hashed_password=$($python_cmd -c "
import bcrypt

def hash_password(password, rounds=12):
    salt = bcrypt.gensalt(rounds=rounds)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

print(hash_password('$password'))
")
    
    echo "$hashed_password"
}

# Load MongoDB credentials from env file
load_mongo_credentials() {
    if [[ "$SETUP_MODE" == "dev" ]]; then
        ENV_FILE="$PROJECT_ROOT/.env.development"
    else
        ENV_FILE="$PROJECT_ROOT/.env.production"
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
    
    # Source the env file
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    MONGO_USER="$MONGO_ROOT_USERNAME"
    MONGO_PASS="$MONGO_ROOT_PASSWORD"
    MONGO_DB="$MONGO_DATABASE"
    
    if [ -z "$MONGO_USER" ] || [ -z "$MONGO_PASS" ]; then
        log_error "MongoDB credentials not found in environment file"
        exit 1
    fi
}

# Collect SuperAdmin data
collect_superadmin_data() {
    log_header "SUPERADMIN USER CREATION"
    
    log_info "Please provide SuperAdmin account details:"
    echo ""
    
    while true; do
        prompt_user "First Name" "Super" "FIRST_NAME"
        if validate_name "$FIRST_NAME"; then
            break
        fi
        log_error "First name must be at least 2 characters"
    done
    
    while true; do
        prompt_user "Last Name" "Admin" "LAST_NAME"
        if validate_name "$LAST_NAME"; then
            break
        fi
        log_error "Last name must be at least 2 characters"
    done
    
    while true; do
        prompt_user "Email" "admin@bitetrack.local" "EMAIL"
        if validate_email "$EMAIL"; then
            break
        fi
        log_error "Invalid email format"
    done
    
    while true; do
        prompt_user "Date of Birth (YYYY-MM-DD)" "1990-01-01" "DOB"
        if validate_date "$DOB"; then
            break
        fi
        log_error "Invalid date format. Use YYYY-MM-DD"
    done
    
    echo ""
    log_info "Password requirements:"
    echo "  • At least 8 characters"
    echo "  • One uppercase, one lowercase letter"
    echo "  • One number and one special character"
    echo ""
    
    while true; do
        prompt_password "Password" "PASSWORD"
        if validate_password "$PASSWORD"; then
            prompt_password "Confirm Password" "CONFIRM_PASSWORD"
            if [[ "$PASSWORD" == "$CONFIRM_PASSWORD" ]]; then
                break
            else
                log_error "Passwords do not match"
            fi
        else
            log_error "Password does not meet requirements"
        fi
    done
    
    log_success "SuperAdmin data collected"
}

# Check if user exists
check_existing_user() {
    log_info "Checking if user already exists..."
    
    local existing_user=$(docker compose exec -T mongodb mongosh \
        -u "$MONGO_USER" -p "$MONGO_PASS" \
        --authenticationDatabase admin "$MONGO_DB" \
        --eval "db.sellers.findOne({email: '$EMAIL'})" \
        --quiet 2>/dev/null)
    
    if [[ "$existing_user" != "null" && -n "$existing_user" ]]; then
        log_error "A user with email '$EMAIL' already exists"
        exit 1
    fi
    
    log_success "Email is available"
}

# Create SuperAdmin user
create_superadmin_user() {
    log_info "Creating SuperAdmin user..."
    
    # Hash password
    log_info "Hashing password..."
    HASHED_PASSWORD=$(hash_password "$PASSWORD")
    
    if [ -z "$HASHED_PASSWORD" ]; then
        log_error "Failed to hash password"
        exit 1
    fi
    
    log_success "Password hashed successfully"
    
    # Insert user
    log_info "Inserting user into MongoDB..."
    
    local result=$(docker compose exec -T mongodb mongosh \
        -u "$MONGO_USER" -p "$MONGO_PASS" \
        --authenticationDatabase admin "$MONGO_DB" \
        --eval "
        db.sellers.insertOne({
            firstName: '$FIRST_NAME',
            lastName: '$LAST_NAME',
            email: '$EMAIL',
            dateOfBirth: new Date('$DOB'),
            password: '$HASHED_PASSWORD',
            role: 'superadmin',
            createdBy: 'Self',
            activatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        })
        " --quiet 2>/dev/null)
    
    if [[ "$result" == *"acknowledged: true"* ]]; then
        log_success "SuperAdmin user created successfully"
        
        echo ""
        echo -e "${GREEN}SuperAdmin Account Created${NC}"
        echo -e "${CYAN}Details:${NC}"
        echo "  Name: $FIRST_NAME $LAST_NAME"
        echo "  Email: $EMAIL"
        echo "  Role: superadmin"
        echo ""
        
        # Update .secrets file with admin credentials
        if [ -f "$PROJECT_ROOT/.secrets" ]; then
            cat >> "$PROJECT_ROOT/.secrets" << EOF

# SuperAdmin Credentials (added $(date))
SUPERADMIN_EMAIL=$EMAIL
SUPERADMIN_FIRST_NAME=$FIRST_NAME
SUPERADMIN_LAST_NAME=$LAST_NAME
SUPERADMIN_DOB=$DOB
EOF
            log_success "SuperAdmin credentials added to .secrets file"
        fi
        
        return 0
    else
        log_error "Failed to create user"
        log_error "MongoDB response: $result"
        exit 1
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT"
    
    # Load MongoDB credentials
    load_mongo_credentials
    
    # Collect SuperAdmin data
    collect_superadmin_data
    
    # Check if user exists
    check_existing_user
    
    # Create user
    create_superadmin_user
    
    log_success "SuperAdmin setup complete"
}

main "$@"
