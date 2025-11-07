#!/bin/bash

# BiteTrack Shared Environment Loading Functions
# This library provides standardized environment loading for all scripts
# Source this file in scripts: source "$(dirname "$0")/lib/env-loader.sh"

# Auto-detect and load appropriate environment file
load_environment() {
    local verbose=${1:-false}
    local env_file=""
    
    # Detect environment file in order of preference:
    # 1. .env.production (if exists)
    # 2. .env.development (if exists) 
    # 3. .env.docker (if exists)
    # 4. .env (if exists)
    # Check both current directory and parent directory (for scripts in subdirectories)
    
    local search_dirs=(".", "..")
    for dir in "${search_dirs[@]}"; do
        if [ -f "$dir/.env.production" ]; then
            env_file="$dir/.env.production"
            [ "$verbose" = true ] && echo "[ENV] Using production environment: $env_file"
            break
        elif [ -f "$dir/.env.development" ]; then
            env_file="$dir/.env.development"
            [ "$verbose" = true ] && echo "[ENV] Using development environment: $env_file"
            break
        elif [ -f "$dir/.env.docker" ]; then
            env_file="$dir/.env.docker"
            [ "$verbose" = true ] && echo "[ENV] Using docker environment: $env_file"
            break
        elif [ -f "$dir/.env" ]; then
            env_file="$dir/.env"
            [ "$verbose" = true ] && echo "[ENV] Using default environment: $env_file"
            break
        fi
    done
    
    # Load environment file if found
    if [ -n "$env_file" ]; then
        # Only load variables that aren't already set in the shell
        set -a  # automatically export all variables
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            [[ "$line" =~ ^[[:space:]]*# ]] && continue
            [[ -z "${line// }" ]] && continue
            
            # Extract variable name
            var_name="${line%%=*}"
            
            # Only set if not already defined
            if [ -z "${!var_name}" ]; then
                eval "$line"
            fi
        done < "$env_file"
        set +a  # stop automatically exporting
        
        [ "$verbose" = true ] && echo "[ENV] Loaded environment from $env_file"
    else
        [ "$verbose" = true ] && echo "[ENV] No environment file found, using shell environment and defaults"
    fi
}

# Parse MongoDB credentials with fallback options
parse_mongo_credentials() {
    local verbose=${1:-false}
    
    # Option 1: Use separate credentials if available
    if [ -n "$MONGO_ROOT_USERNAME" ] && [ -n "$MONGO_ROOT_PASSWORD" ]; then
        MONGO_USER="$MONGO_ROOT_USERNAME"
        MONGO_PASS="$MONGO_ROOT_PASSWORD"
        [ "$verbose" = true ] && echo "[ENV] Using separate MongoDB credentials"
        return 0
    fi
    
    # Option 2: Parse from MONGO_URI if available
    if [ -n "$MONGO_URI" ]; then
        # Extract credentials from mongodb://username:password@host:port/database format
        if [[ "$MONGO_URI" =~ mongodb://([^:]+):([^@]+)@.* ]]; then
            MONGO_USER="${BASH_REMATCH[1]}"
            MONGO_PASS="${BASH_REMATCH[2]}"
            [ "$verbose" = true ] && echo "[ENV] Parsed MongoDB credentials from MONGO_URI"
            return 0
        fi
    fi
    
    # Option 3: Use defaults as final fallback
    MONGO_USER="${MONGO_USER:-admin}"
    MONGO_PASS="${MONGO_PASS:-supersecret}"
    [ "$verbose" = true ] && echo "[ENV] Using default MongoDB credentials"
    
    # Validate we have credentials
    if [ -z "$MONGO_USER" ] || [ -z "$MONGO_PASS" ]; then
        echo "ERROR: MongoDB credentials not found" >&2
        echo "Please set MONGO_ROOT_USERNAME/MONGO_ROOT_PASSWORD or provide valid MONGO_URI" >&2
        return 1
    fi
    
    return 0
}

# Complete environment setup for BiteTrack scripts
setup_bitetrack_environment() {
    local verbose=${1:-false}
    
    # Load environment file
    load_environment "$verbose"
    
    # Parse MongoDB credentials
    if ! parse_mongo_credentials "$verbose"; then
        return 1
    fi
    
    # Export for use in scripts
    export MONGO_USER
    export MONGO_PASS
    
    if [ "$verbose" = true ]; then
        echo "[ENV] MongoDB user: $MONGO_USER"
        echo "[ENV] MongoDB password: [REDACTED]"
        echo "[ENV] Environment setup complete"
    fi
    
    return 0
}

# Detect current environment type
detect_environment_type() {
    if [ -f ".env.production" ] || [ -f "../.env.production" ] || [ "$NODE_ENV" = "production" ]; then
        echo "production"
    elif [ -f ".env.development" ] || [ -f "../.env.development" ] || [ "$NODE_ENV" = "development" ]; then
        echo "development" 
    elif [ -f ".env.docker" ] || [ -f "../.env.docker" ]; then
        echo "docker"
    else
        echo "unknown"
    fi
}
