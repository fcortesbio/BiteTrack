# BiteTrack Scripts Suite

This directory contains a comprehensive suite of utility and testing scripts for BiteTrack, **designed for both interactive use and automation**. Scripts are organized in logical workflow order for easy project setup, maintenance, and CI/CD integration.

## Quick Start Guide

### For New Environments

```bash
# Complete production setup (interactive)
./scripts/00-init-production-setup.sh

# Or automated setup (non-interactive)
export ADMIN_EMAIL="admin@company.com"
export ADMIN_PASSWORD="SecurePass123!"
export ADMIN_FIRST_NAME="Admin"
export ADMIN_LAST_NAME="User"
export ADMIN_DOB="1990-01-01"
./scripts/00-init-production-setup.sh --non-interactive
```

### For CI/CD Pipelines

```bash
# Basic health check
./scripts/02-quick-persistence-test.sh

# Create admin user (automated)
./scripts/03-create-superadmin.sh --non-interactive

# Populate test data
node scripts/04-populate-test-data.js --preset=dev --clean

# Run comprehensive tests
./scripts/05-test-data-persistence.sh --verbose
node scripts/06-test-sales-filtering.js --auth-token=$API_TOKEN
node scripts/07-test-reporting-features.js --auth-token=$API_TOKEN
```

---

## Master Setup Script

### `00-init-production-setup.sh`

**Purpose:** Complete production deployment orchestration with automation support
**Usage:**

- Interactive: `./scripts/00-init-production-setup.sh`
- Automated: `./scripts/00-init-production-setup.sh --non-interactive`

**Duration:** ~5-10 minutes (interactive) | ~2-3 minutes (automated)
**What it does:** Orchestrates all numbered scripts in sequence for complete setup

**Complete Setup Process:**

- Docker cleanup (optional) - Fresh environment
- Environment configuration - Interactive prompts or env vars
- MongoDB keyfile generation - Secure replica set auth
- Container startup - Production-ready Docker stack
- Health verification - System status validation
- SuperAdmin creation - Administrative user setup
- Test data population - Sample data (optional)
- Comprehensive testing - Full system validation

**Automation Features:**

- **Non-interactive mode** - Full automation with environment variables
- **Exit codes** - Proper CI/CD integration (0=success, 1=failure)
- **Logging** - Structured output for build systems
- **Error handling** - Fails fast with detailed error messages
- **Environment detection** - Automatically configures for production vs development

**Non-Interactive Environment Variables:**

```bash
ADMIN_EMAIL="admin@company.com" # Required: Admin email
ADMIN_PASSWORD="SecurePass123!" # Required: Admin password
ADMIN_FIRST_NAME="Admin" # Required: Admin first name
ADMIN_LAST_NAME="User" # Required: Admin last name
ADMIN_DOB="1990-01-01" # Required: Admin date of birth
SKIP_TEST_DATA="true" # Optional: Skip test data population
SKIP_CLEANUP="true" # Optional: Skip Docker cleanup
```

**Use cases:**

- **Production deployments** - Complete production environment setup
- **CI/CD pipelines** - Automated deployment and testing
- **Fresh installations** - New server or clean environment setup
- **Team onboarding** - Guided setup for new team members
- **Demo environments** - Quick professional environment creation

---

## Individual Script Workflow Order

The scripts are numbered to follow a logical development and deployment workflow, with each supporting both interactive and non-interactive modes:

### **Phase 1: Environment Setup**

### `01-setup-keyfile.sh`

**Purpose:** MongoDB keyfile setup for replica set authentication
**Usage:**

- Standard: `./scripts/01-setup-keyfile.sh`
- CI/CD: `./scripts/01-setup-keyfile.sh --force`

**Duration:** ~2 seconds
**What it does:** Creates or copies MongoDB keyfile with proper permissions

**Non-Interactive Options:**

- `--force` - Overwrite existing keyfile without confirmation
- `KEYFILE_PATH="/path/to/keyfile"` - Environment variable for custom keyfile location

**Features:**

- Copies from keyfile.example if available
- Generates new keyfile if no example exists
- Sets proper file permissions (600)
- Development-only usage (production should have unique keyfiles)

**Use cases:**

- Initial project setup
- New developer onboarding
- Fresh development environment setup
- CI/CD pipeline initialization

### `02-quick-persistence-test.sh`

**Purpose:** Quick system health and data persistence verification
**Usage:**

- Standard: `./scripts/02-quick-persistence-test.sh`
- Verbose: `./scripts/02-quick-persistence-test.sh --verbose`

**Duration:** ~5 seconds
**What it tests:** Basic MongoDB connectivity and data operations

**Non-Interactive Options:**

- `--verbose` - Display detailed test information
- `--json` - Output results in JSON format for CI/CD
- Environment variables for credentials (see Environment Variables section)

**Features:**

- **Production-ready environment detection** - Auto-detects .env.production vs .env.development
- **Flexible credential handling** - Supports multiple credential formats
- Quick database write/read/delete test cycle
- Perfect for CI/CD pipeline validation

**Use cases:**

- Verify stack is running correctly
- CI/CD pipeline health checks
- Pre-deployment validation
- Quick troubleshooting

### **Phase 2: System Initialization**

### `03-create-superadmin.sh`

**Purpose:** Create initial SuperAdmin user account
**Usage:**

- Interactive: `./scripts/03-create-superadmin.sh`
- Automated: `./scripts/03-create-superadmin.sh --non-interactive`
- Help: `./scripts/03-create-superadmin.sh --help`

**Duration:** ~10-20 seconds
**What it does:** Creates and validates superadmin user in one step

**Non-Interactive Environment Variables:**

```bash
ADMIN_FIRST_NAME="John" # First name (required)
ADMIN_LAST_NAME="Doe" # Last name (required)
ADMIN_EMAIL="admin@company.com" # Email address (required, must be unique)
ADMIN_DOB="1990-01-01" # Date of birth in YYYY-MM-DD format (required)
ADMIN_PASSWORD="SecurePass123!" # Password meeting complexity requirements (required)
```

**Features:**

- **Production-ready environment support** - Works with any environment configuration
- Interactive prompts with comprehensive input validation
- Non-interactive mode for automation (CI/CD)
- Duplicate email detection and prevention
- Secure password hashing (bcrypt compatible)
- Direct MongoDB insertion and verification
- No manual copy/paste steps required

**Use cases:**

- Initial system setup (CRITICAL - required for API access)
- Automated deployments
- CI/CD pipeline user creation
- Production environment initialization

### `04-populate-test-data.js`

**Purpose:** Populate database with realistic test data
**Usage:** `node scripts/04-populate-test-data.js [--preset=<preset>] [--clean] [--verbose]`
**Duration:** ~10-30 seconds (depending on preset)
**What it does:** Creates customers, products, sales with proper relationships

**Non-Interactive Options:**

- `--preset=<preset>` - Data size preset (minimal, dev, full, bulk)
- `--clean` - Remove existing data before populating
- `--verbose` - Display detailed operation info
- `--json` - Output results in JSON format for CI/CD

**Presets:**

- `minimal` - Essential data (5 customers, 7 products, 3 sales)
- `dev` - Development dataset (10 customers, 14 products, 7 sales)
- `full` - Complete realistic dataset (~20 customers, ~35 products)
- `bulk` - Large dataset for performance testing

**Features:**

- Resolves placeholder IDs to real MongoDB ObjectIds
- Schema validation against current models
- Detailed summary report with statistics
- Preserves existing seller accounts during cleanup
- Multiple data presets for different use cases

**Use cases:**

- Development environment setup
- API testing with realistic data
- Performance testing scenarios
- Demo environment preparation

### **Phase 3: Testing & Validation**

### `05-test-data-persistence.sh`

**Purpose:** Comprehensive data persistence testing across failure scenarios
**Usage:**

- Standard: `./scripts/05-test-data-persistence.sh`
- Verbose: `./scripts/05-test-data-persistence.sh --verbose`
- Clean mode: `./scripts/05-test-data-persistence.sh --clean`

**Duration:** ~2-3 minutes
**What it tests:** Enterprise-grade persistence validation

**Non-Interactive Options:**

- `--verbose` - Display detailed test information
- `--clean` - Clean up test data after testing
- `--quick` - Run abbreviated test suite for faster results
- `--json` - Output results in JSON format for CI/CD

**Comprehensive Test Suite:**

- MongoDB container restarts → Data survives
- API container restarts → Data survives
- Full stack restarts → Data survives
- Volume integrity verification → Data preserved

**Features:**

- **Production environment support** - Works with production credentials
- Automated test data creation and cleanup
- Detailed logging with verbose mode
- Container orchestration testing
- Docker volume integrity validation

**Use cases:**

- Production deployment verification
- Infrastructure change validation
- Disaster recovery testing
- Development environment validation

### `06-test-sales-filtering.js`

**Purpose:** Advanced API feature testing (sales filtering, pagination, sorting)
**Usage:**

- Standard: `node scripts/06-test-sales-filtering.js`
- With token: `node scripts/06-test-sales-filtering.js --auth-token=<token>`
- Verbose: `node scripts/06-test-sales-filtering.js --verbose`

**Duration:** ~15-30 seconds
**What it tests:** Complex API functionality and performance

**Non-Interactive Options:**

- `--auth-token=<token>` - JWT authentication token
- `--verbose` - Display detailed test information
- `--json` - Output results in JSON format for CI/CD
- Environment variables for authentication (see Environment Variables section)

**Comprehensive API Tests:**

- Pagination functionality and metadata accuracy
- Multi-field sorting (ascending/descending)
- Date range filtering with edge cases
- Settlement status filtering
- Population of nested references (customer, seller, product data)
- Combined filtering scenarios
- Error handling for invalid parameters
- Response structure validation

**Use cases:**

- Feature validation after API changes
- Regression testing for sales endpoints
- Performance validation for complex queries
- CI/CD integration testing

### `07-test-reporting-features.js`

**Purpose:** Tests reporting and CSV export capabilities
**Usage:**

- Standard: `node scripts/07-test-reporting-features.js`
- With token: `node scripts/07-test-reporting-features.js --auth-token=<token>`
- Base URL: `node scripts/07-test-reporting-features.js --base-url=<url>`
- Verbose: `node scripts/07-test-reporting-features.js --verbose`
- Help: `node scripts/07-test-reporting-features.js --help`

**Duration:** ~15-30 seconds
**What it tests:** Analytics endpoints and CSV export functionality

**Non-Interactive Options:**

- `--auth-token=<token>` - JWT authentication token
- `--base-url=<url>` - API base URL [default: http://localhost:3000/bitetrack]
- `--verbose` - Display detailed test information

**Environment Variables:**

- `TEST_EMAIL` - Email for authentication [default: admin@bitetrack.com]
- `TEST_PASSWORD` - Password for authentication [default: SuperAdmin123!]

**Comprehensive Test Suite:**

- Basic analytics structure validation
- Date range analytics testing
- Time grouping options (day/week/month/year)
- CSV export formats (detailed, summary, products)
- Invalid parameter handling
- Performance with large datasets

**Use cases:**

- Reporting feature validation
- CSV export functionality testing
- Analytics endpoint verification
- CI/CD integration testing

---

## Adding New Scripts

When adding new scripts to this directory:

1. **Make executable:** `chmod +x scripts/your-script.sh`
2. **Add shebang:** Start with `#!/bin/bash`
3. **Add description:** Include purpose and usage in comments
4. **Update this document:** Document the new script
5. **Follow naming:** Use kebab-case (dash-separated) names
6. **Include error handling:** Use `set -e` for robust scripts
7. **Support non-interactive mode:** Add `--non-interactive` option for CI/CD
8. **Add --help option:** Include documentation in the script itself

## Environment Variables

**Security Enhancement:** Scripts now read MongoDB credentials from environment variables instead of hardcoding them.

### Credential Loading Priority:

1. **Environment variables** (if already set):
   - `MONGO_ROOT_USERNAME`
   - `MONGO_ROOT_PASSWORD`

2. **From .env.development file** (automatically loaded):

   ```bash
   MONGO_ROOT_USERNAME=admin
   MONGO_ROOT_PASSWORD=supersecret
   ```

3. **Fallback defaults** (if nothing else is found):
   - Username: `admin`
   - Password: `supersecret`

### Manual Override:

```bash
# Override credentials for a single run
MONGO_ROOT_USERNAME=myuser MONGO_ROOT_PASSWORD=mypass ./scripts/02-quick-persistence-test.sh

# Set in current shell session
export MONGO_ROOT_USERNAME=myuser
export MONGO_ROOT_PASSWORD=mypass
./scripts/05-test-data-persistence.sh
```

### Non-Interactive Mode Variables:

For `03-create-superadmin.sh --non-interactive`, set these environment variables:

```bash
ADMIN_FIRST_NAME="John" # First name (required)
ADMIN_LAST_NAME="Doe" # Last name (required)
ADMIN_EMAIL="admin@company.com" # Email address (required, must be unique)
ADMIN_DOB="1990-01-01" # Date of birth in YYYY-MM-DD format (required)
ADMIN_PASSWORD="SecurePass123!" # Password meeting complexity requirements (required)
```

## CI/CD Integration

All scripts are designed for CI/CD integration with proper exit codes:

- `0` - Script executed successfully
- `1` - Script encountered an error
- `2` - Missing prerequisites or invalid parameters

### Example CI/CD Script:

```bash
#!/bin/bash
set -e # Exit on any error

# 1. Setup environment
./scripts/01-setup-keyfile.sh --force

# 2. Verify database connectivity
./scripts/02-quick-persistence-test.sh --json > persistence_test.json

# 3. Create admin user if not exists
export ADMIN_EMAIL="ci-admin@bitetrack.com"
export ADMIN_PASSWORD="CIPassword123!"
export ADMIN_FIRST_NAME="CI"
export ADMIN_LAST_NAME="Admin"
export ADMIN_DOB="2000-01-01"
./scripts/03-create-superadmin.sh --non-interactive || true # Don't fail if user exists

# 4. Populate test data
node scripts/04-populate-test-data.js --preset=minimal --clean --json > test_data.json

# 5. Run tests
./scripts/05-test-data-persistence.sh --quick --json > persistence_results.json

# 6. Get auth token
TOKEN=$(curl -s -X POST http://localhost:3000/bitetrack/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.token')

# 7. Run API tests
node scripts/06-test-sales-filtering.js --auth-token=$TOKEN --json > sales_test.json
node scripts/07-test-reporting-features.js --auth-token=$TOKEN --json > report_test.json

echo "All tests completed successfully!"
```

## Script Dependencies

All scripts assume:

- Docker and Docker Compose are installed
- BiteTrack stack is available (docker-compose.yml exists)
- Environment file (.env.development) is configured with MongoDB credentials
- Network connectivity to MongoDB container
