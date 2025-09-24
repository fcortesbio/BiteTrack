# BiteTrack Scripts

This directory contains utility and testing scripts for BiteTrack.

## Available Scripts

### `create-superadmin.sh`
**Purpose:** Streamlined superadmin user creation directly in MongoDB  
**Usage:** `./scripts/create-superadmin.sh [--non-interactive] [--help]`  
**Duration:** ~10-20 seconds  
**What it does:** Creates and validates superadmin user in one step

**Features:**
- Interactive prompts with input validation
- Non-interactive mode for CI/automation
- Duplicate email detection
- Secure password hashing (bcrypt compatible)
- Direct MongoDB insertion and verification
- No manual copy/paste required

**Use cases:**
- Initial system setup
- Automated deployments
- CI/CD pipeline user creation
- Replace the legacy create-superadmin.js workflow

### `quick-persistence-test.sh`
**Purpose:** Quick data persistence verification for CI/automation  
**Usage:** `./scripts/quick-persistence-test.sh`  
**Duration:** ~5 seconds  
**What it tests:** Basic data write/read/delete operations

**Use cases:**
- Continuous Integration pipelines
- Quick health checks
- Automated deployment verification
- Pre-production validation

### `populate-test-data.js`
**Purpose:** Populate database with comprehensive test data from /test-data JSON files  
**Usage:** `node scripts/populate-test-data.js [--preset=<preset>] [--clean] [--verbose]`  
**Duration:** ~10-30 seconds depending on preset  
**What it does:** Creates realistic customers, products, sales, and pending sellers with proper ID relationships

**Presets:**
- `minimal` - Essential data (5 customers, 7 products, 3 sales)
- `dev` - Development dataset (10 customers, 14 products, 7 sales) 
- `full` - Complete realistic dataset (~20 customers, ~35 products)
- `bulk` - Large dataset for performance testing

**Features:**
- Resolves placeholder IDs in sales templates to real MongoDB ObjectIds
- Validates all data against current schemas
- Generates summary report with statistics and sample IDs
- Preserves existing seller accounts during cleanup

**Use cases:**
- Development environment setup
- API testing with realistic data
- Performance testing with bulk datasets
- Consistent test data across team members

### `test-sales-filtering.js`
**Purpose:** Test suite for advanced sales filtering features (pagination, sorting, date ranges)  
**Usage:** `node scripts/test-sales-filtering.js [--auth-token=<token>] [--verbose]`  
**Duration:** ~15-30 seconds  
**What it tests:** All new sales filtering parameters and response structures

**Tests performed:**
- Pagination functionality and metadata accuracy
- Sorting by various fields (ascending/descending)
- Date range filtering with startDate/endDate
- Settlement status filtering (settled/unsettled)
- Populated references (customer, seller, product data)
- Combined filtering scenarios
- Error handling for invalid parameters

**Use cases:**
- Validate advanced filtering features after changes
- Regression testing for sales API
- Performance validation for complex queries
- Continuous integration testing

---

## Root Level Scripts

### `test-data-persistence.sh` (in project root)
**Purpose:** Comprehensive data persistence testing across all failure scenarios  
**Usage:** `./test-data-persistence.sh [--verbose] [--clean]`  
**Duration:** ~2-3 minutes  
**What it tests:** 
- MongoDB container restarts
- API container restarts  
- Full stack restarts
- Volume integrity verification

**Options:**
- `--verbose`: Enable detailed output
- `--clean`: Only cleanup test data and exit
- `--help`: Show usage information

**Use cases:**
- Production deployment verification
- Infrastructure changes validation
- Disaster recovery testing
- Development environment verification

---

## Adding New Scripts

When adding new scripts to this directory:

1. **Make executable:** `chmod +x scripts/your-script.sh`
2. **Add shebang:** Start with `#!/bin/bash`
3. **Add description:** Include purpose and usage in comments
4. **Update this README:** Document the new script
5. **Follow naming:** Use kebab-case (dash-separated) names
6. **Include error handling:** Use `set -e` for robust scripts

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
MONGO_ROOT_USERNAME=myuser MONGO_ROOT_PASSWORD=mypass ./scripts/quick-persistence-test.sh

# Set in current shell session
export MONGO_ROOT_USERNAME=myuser
export MONGO_ROOT_PASSWORD=mypass
./test-data-persistence.sh
```

### Non-Interactive Mode Variables:
For `create-superadmin.sh --non-interactive`, set these environment variables:
```bash
ADMIN_FIRST_NAME="John"              # First name (required)
ADMIN_LAST_NAME="Doe"               # Last name (required)
ADMIN_EMAIL="admin@company.com"     # Email address (required, must be unique)
ADMIN_DOB="1990-01-01"             # Date of birth in YYYY-MM-DD format (required)
ADMIN_PASSWORD="SecurePass123!"     # Password meeting complexity requirements (required)
```

## Script Dependencies

All scripts assume:
- Docker and Docker Compose are installed
- BiteTrack stack is available (docker-compose.yml exists)
- Environment file (.env.development) is configured with MongoDB credentials
- Network connectivity to MongoDB container
