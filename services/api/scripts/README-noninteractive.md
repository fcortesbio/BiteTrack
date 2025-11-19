# BiteTrack Non-Interactive Setup

This directory contains the non-interactive setup script for BiteTrack, perfect for automated deployments, CI/CD pipelines, or quick local development setup.

## Quick Start

### Option 1: Single Command Line (Recommended)

```bash
./scripts/init-noninteractive.sh \
  --mongo-password 'SecurePass123' \
  --admin-email 'admin@bitetrack.com' \
  --admin-password 'AdminPass123' \
  --admin-first-name 'John' \
  --admin-last-name 'Doe' \
  --admin-dob '1990-01-01' \
  --frontend-urls 'http://localhost:3000,http://localhost:4173' \
  --skip-test-data
```

### Option 2: Environment Variables

```bash
# Copy and modify the example environment file
cp scripts/init-example.env scripts/my-setup.env

# Edit the values in my-setup.env
nano scripts/my-setup.env

# Source the environment file and run the setup
source scripts/my-setup.env && ./scripts/init-noninteractive.sh --skip-test-data --skip-tests
```

### Option 3: Inline Environment Variables

```bash
BITETRACK_MONGO_PASSWORD='SecurePass123' \
BITETRACK_ADMIN_EMAIL='admin@bitetrack.com' \
BITETRACK_ADMIN_PASSWORD='AdminPass123' \
BITETRACK_ADMIN_FIRST_NAME='John' \
BITETRACK_ADMIN_LAST_NAME='Doe' \
BITETRACK_ADMIN_DOB='1990-01-01' \
./scripts/init-noninteractive.sh --skip-test-data --skip-tests
```

## What It Does

The non-interactive script performs all the same steps as the interactive version:

1. **Prerequisites Check** - Verifies Docker, tools, etc.
2. **Docker Cleanup** - Cleans up existing containers
3. **Environment Configuration** - Creates `.env.production`
4. **MongoDB Keyfile Setup** - Generates security keyfile
5. **Docker Containers** - Starts all services
6. **System Health Check** - Verifies API is running
7. **SuperAdmin User** - Creates initial admin account
8. **Secrets File** - Generates `.secrets` with credentials
9. **Environment Symlink** - Creates `.env` → `.env.production`
10. **Test Data** - Populates sample data (optional)
11. **Tests** - Runs comprehensive tests (optional)

## Required Parameters

These parameters are **required** and must be provided either as command line arguments or environment variables:

- **MongoDB Password**: `--mongo-password` or `BITETRACK_MONGO_PASSWORD`
- **Admin Email**: `--admin-email` or `BITETRACK_ADMIN_EMAIL`
- **Admin Password**: `--admin-password` or `BITETRACK_ADMIN_PASSWORD`
- **Admin First Name**: `--admin-first-name` or `BITETRACK_ADMIN_FIRST_NAME`
- **Admin Last Name**: `--admin-last-name` or `BITETRACK_ADMIN_LAST_NAME`
- **Admin Date of Birth**: `--admin-dob` or `BITETRACK_ADMIN_DOB` (YYYY-MM-DD format)

## Optional Parameters

All other parameters have sensible defaults:

- **MongoDB User**: `bitetrack-admin` (default)
- **MongoDB Database**: `bitetrack` (default)
- **App Port**: `3000` (default)
- **Frontend URLs**: `http://localhost:3000` (default)
- **JWT Expiration**: `7d` (default)
- **Log Level**: `info` (default)
- **Cleanup Option**: `1` (BiteTrack only, default)

## Usage Examples

### Minimal Setup (Skip Optional Steps)

```bash
./scripts/init-noninteractive.sh \
  --mongo-password 'SecurePass123' \
  --admin-email 'admin@bitetrack.com' \
  --admin-password 'AdminPass123' \
  --admin-first-name 'John' \
  --admin-last-name 'Doe' \
  --admin-dob '1990-01-01' \
  --skip-test-data \
  --skip-tests
```

### Full Setup with Custom Configuration

```bash
./scripts/init-noninteractive.sh \
  --mongo-user 'mycompany-admin' \
  --mongo-password 'VerySecurePass123!' \
  --mongo-db 'mycompany-bitetrack' \
  --port 8080 \
  --frontend-urls 'https://app.mycompany.com,https://admin.mycompany.com' \
  --admin-email 'admin@mycompany.com' \
  --admin-password 'StrongAdminPass123!' \
  --admin-first-name 'Jane' \
  --admin-last-name 'Smith' \
  --admin-dob '1985-06-15' \
  --cleanup 2
```

### CI/CD Pipeline Usage

```bash
#!/bin/bash
# For automated deployments
./scripts/init-noninteractive.sh \
  --mongo-password "$MONGO_PASSWORD" \
  --admin-email "$ADMIN_EMAIL" \
  --admin-password "$ADMIN_PASSWORD" \
  --admin-first-name "$ADMIN_FIRST_NAME" \
  --admin-last-name "$ADMIN_LAST_NAME" \
  --admin-dob "$ADMIN_DOB" \
  --frontend-urls "$FRONTEND_URLS" \
  --skip-test-data \
  --skip-tests \
  --cleanup 3
```

## After Setup

Once the script completes successfully, your BiteTrack instance will be ready with:

- **API**: http://localhost:3000/bitetrack/\*
- **Documentation**: http://localhost:3000/bitetrack/api-docs
- **Health Check**: http://localhost:3000/bitetrack/health
- **Credentials**: Stored in `.secrets` file

## Troubleshooting

- **Permission Errors**: Make sure the script is executable: `chmod +x scripts/init-noninteractive.sh`
- **Docker Issues**: Ensure Docker and Docker Compose are installed and running
- **Port Conflicts**: Change the port with `--port 8080` if 3000 is in use
- **MongoDB Errors**: Try cleanup option 2 for complete Docker reset: `--cleanup 2`

## Security Notes

- The `.secrets` file contains all production credentials
- File permissions are automatically set to 600 (owner-only access)
- The `.secrets` file is automatically added to `.gitignore`
- Never commit credentials to version control
