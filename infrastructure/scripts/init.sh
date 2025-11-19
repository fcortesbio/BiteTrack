#!/bin/bash

# BiteTrack Monorepo Interactive Setup
# Main entry point for initializing BiteTrack development and production environments
#
# Usage: ./infrastructure/scripts/init.sh

set -e

# Ensure UTF-8 encoding
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# Colors for output (NO EMOJIS - terminal does not display them well)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/infrastructure"
SCRIPTS_DIR="$INFRASTRUCTURE_DIR/scripts"

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

confirm_action() {
    local prompt="$1"
    echo -ne "${YELLOW}$prompt${NC} [y/N]: "
    read -r response
    case "$response" in
        [yY]|[yY][eE][sS]) return 0 ;;
        *) return 1 ;;
    esac
}

# Show welcome message
show_welcome() {
    clear
    echo -e "${CYAN}"
    echo "     ____  _ _       _____                _    "
    echo "    |  _ \\\\(_) |_ ___|_   _| __ __ _  ___| | __"
    echo "    | |_) | | __/ _ \\\\ | || '__/ _\` |/ __| |/ /"
    echo "    |  _ <| | ||  __/ | || | | (_| | (__|   < "
    echo "    |_| \\\\_\\\\_|\\\\__\\\\___| |_||_|  \\\\__,_|\\\\___|_|\\\\_\\\\"
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}Monorepo Setup Wizard${NC}"
    echo -e "Initialize BiteTrack for development or production deployment"
    echo ""
    echo -e "${BLUE}This script will:${NC}"
    echo "  1. Clean Docker environment (optional)"
    echo "  2. Generate environment files (.env.development and/or .env.production)"
    echo "  3. Set up MongoDB with keyfile for replica set"
    echo "  4. Start Docker containers"
    echo "  5. Create SuperAdmin user"
    echo "  6. Generate .secrets file with credentials"
    echo ""
}

# Main menu
show_menu() {
    log_header "SETUP OPTIONS"
    echo ""
    echo "  1. Full setup - Development environment"
    echo "  2. Full setup - Production environment"
    echo "  3. Full setup - Both environments"
    echo "  4. Quick setup - Use existing environment files"
    echo "  5. Exit"
    echo ""
    echo -ne "${YELLOW}Select an option [1-5]:${NC} "
    read -r choice
    echo ""
    
    case "$choice" in
        1)
            export SETUP_MODE="dev"
            ;;
        2)
            export SETUP_MODE="prod"
            ;;
        3)
            export SETUP_MODE="both"
            ;;
        4)
            export SETUP_MODE="quick"
            ;;
        5|"")
            log_info "Setup cancelled by user"
            exit 0
            ;;
        *)
            log_error "Invalid option"
            return 1
            ;;
    esac
    
    return 0
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
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
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        echo "Please install Node.js (>= 18.0.0) and try again."
        return 1
    fi
    
    # Check Python and bcrypt for password hashing
    local python_cmd="python3"
    if ! command -v python3 &> /dev/null; then
        if ! command -v python &> /dev/null; then
            log_error "Python is required but not found"
            return 1
        fi
        python_cmd="python"
    fi
    
    if ! $python_cmd -c "import bcrypt" 2>/dev/null; then
        log_error "Python bcrypt module is required but not installed"
        log_error "Install with: pip3 install bcrypt"
        return 1
    fi
    
    log_success "All prerequisites are available"
    return 0
}

# Clean environment
clean_environment() {
    log_header "ENVIRONMENT CLEANUP"
    
    if [[ "$SETUP_MODE" == "quick" ]]; then
        log_info "Skipping cleanup for quick setup"
        return 0
    fi
    
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
            cd "$PROJECT_ROOT"
            docker compose -f infrastructure/docker-compose.yml down -v 2>/dev/null || true
            log_success "BiteTrack cleanup completed"
            ;;
        2)
            log_warning "WARNING: COMPLETE DOCKER CLEANUP SELECTED"
            log_warning "This will remove ALL Docker containers, images, and volumes."
            log_warning "This affects ALL projects on your system, not just BiteTrack."
            echo ""
            if confirm_action "Are you absolutely sure you want to proceed?"; then
                log_info "Performing comprehensive Docker cleanup..."
                docker stop $(docker ps -aq) 2>/dev/null || true
                docker rm $(docker ps -aq) 2>/dev/null || true
                docker rmi $(docker images -aq) 2>/dev/null || true
                docker container prune -f 2>/dev/null || true
                docker volume prune -f 2>/dev/null || true
                log_success "Complete Docker cleanup completed"
            else
                log_info "Complete cleanup cancelled"
            fi
            ;;
        3|"")
            log_info "Skipping Docker cleanup"
            ;;
        *)
            log_error "Invalid option, skipping cleanup"
            ;;
    esac
}

# Main execution
main() {
    show_welcome
    
    if ! confirm_action "Do you want to proceed with the setup?"; then
        log_info "Setup cancelled by user"
        exit 0
    fi
    
    # Check if running from correct directory
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_error "docker-compose.yml not found"
        log_error "Please run this script from the BiteTrack project root"
        exit 1
    fi
    
    # Show menu and get setup mode
    while ! show_menu; do
        echo ""
        log_warning "Please select a valid option"
    done
    
    # Execute setup steps
    check_prerequisites || exit 1
    clean_environment || exit 1
    
    # Run appropriate setup script based on mode
    if [[ "$SETUP_MODE" == "quick" ]]; then
        log_info "Starting quick setup..."
        bash "$SCRIPTS_DIR/quick-start.sh"
    else
        log_info "Starting environment configuration..."
        bash "$SCRIPTS_DIR/setup-env.sh"
        
        log_info "Setting up MongoDB keyfile..."
        bash "$SCRIPTS_DIR/setup-keyfile.sh"
        
        log_info "Starting Docker containers..."
        bash "$SCRIPTS_DIR/start-containers.sh"
        
        log_info "Creating SuperAdmin user..."
        bash "$SCRIPTS_DIR/create-superadmin.sh"
    fi
    
    log_header "SETUP COMPLETED"
    log_success "BiteTrack is ready!"
    echo ""
    echo -e "${BLUE}What was set up:${NC}"
    if [[ "$SETUP_MODE" == "dev" ]]; then
        echo "  - .env.development created at project root"
        echo "  - MongoDB container running on localhost:27017"
        echo "  - Ready for local development (services run outside Docker)"
        echo ""
        echo -e "${BLUE}Next Steps:${NC}"
        echo "  1. Run: npm run dev"
        echo "  2. Services will start on ports: API:3001, MCP:4001"
    elif [[ "$SETUP_MODE" == "prod" ]]; then
        echo "  - .env.production created at project root"
        echo "  - Full Docker stack running (API, MCP, Frontend, Traefik, MongoDB)"
        echo "  - MongoDB accessible on localhost:27017"
        echo ""
        echo -e "${BLUE}Access Points:${NC}"
        echo "  - Frontend: http://localhost (Traefik routing)"
        echo "  - API: http://localhost/bitetrack/health"
        echo "  - API Docs: http://localhost/bitetrack/api-docs"
        echo "  - MCP: http://localhost/mcp/health"
        echo "  - Traefik Dashboard: http://localhost:8080"
    else
        echo "  - Both .env.development and .env.production created"
        echo "  - Full Docker stack running (API, MCP, Frontend, Traefik, MongoDB)"
        echo "  - Development config ready for local workflow"
        echo ""
        echo -e "${BLUE}Production Access Points (Currently Running):${NC}"
        echo "  - Frontend: http://localhost (Traefik routing)"
        echo "  - API: http://localhost/bitetrack/health"
        echo "  - API Docs: http://localhost/bitetrack/api-docs"
        echo "  - MCP: http://localhost/mcp/health"
        echo "  - Traefik Dashboard: http://localhost:8080"
        echo ""
        echo -e "${BLUE}To Switch to Development Mode:${NC}"
        echo "  1. Stop production: docker compose down"
        echo "  2. Start dev: npm run dev (services on ports 3001, 4001, 5001)"
    fi
    echo ""
    echo -e "${YELLOW}Credentials saved in:${NC} $PROJECT_ROOT/.secrets"
    echo ""
}

# Run main function
main "$@"
