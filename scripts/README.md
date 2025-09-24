# BiteTrack Scripts

This directory contains utility and testing scripts for BiteTrack, **organized in logical workflow order** for easy project setup and maintenance.

## 📋 Script Workflow Order

The scripts are numbered to follow a logical development and deployment workflow:

### **Phase 1: Environment Setup** 🔧

### `01-setup-keyfile.sh`
**Purpose:** MongoDB keyfile setup for replica set authentication  
**Usage:** `./scripts/01-setup-keyfile.sh`  
**Duration:** ~2 seconds  
**What it does:** Creates or copies MongoDB keyfile with proper permissions

**Features:**
- Copies from keyfile.example if available
- Generates new keyfile if no example exists
- Sets proper file permissions (600)
- Development-only usage (production should have unique keyfiles)

**Use cases:**
- Initial project setup
- New developer onboarding
- Fresh development environment setup

### `02-quick-persistence-test.sh`
**Purpose:** Quick system health and data persistence verification  
**Usage:** `./scripts/02-quick-persistence-test.sh`  
**Duration:** ~5 seconds  
**What it tests:** Basic MongoDB connectivity and data operations

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

### **Phase 2: System Initialization** 🚀

### `03-create-superadmin.sh`
**Purpose:** Create initial SuperAdmin user account  
**Usage:** `./scripts/03-create-superadmin.sh [--non-interactive] [--help]`  
**Duration:** ~10-20 seconds  
**What it does:** Creates and validates superadmin user in one step

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

### **Phase 3: Testing & Validation** 🧪

### `05-test-data-persistence.sh`
**Purpose:** Comprehensive data persistence testing across failure scenarios  
**Usage:** `./scripts/05-test-data-persistence.sh [--verbose] [--clean]`  
**Duration:** ~2-3 minutes  
**What it tests:** Enterprise-grade persistence validation

**Comprehensive Test Suite:**
- MongoDB container restarts → Data survives ✅
- API container restarts → Data survives ✅
- Full stack restarts → Data survives ✅
- Volume integrity verification → Data preserved ✅

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
**Usage:** `node scripts/06-test-sales-filtering.js [--auth-token=<token>] [--verbose]`  
**Duration:** ~15-30 seconds  
**What it tests:** Complex API functionality and performance

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
MONGO_ROOT_USERNAME=myuser MONGO_ROOT_PASSWORD=mypass ./scripts/02-quick-persistence-test.sh

# Set in current shell session
export MONGO_ROOT_USERNAME=myuser
export MONGO_ROOT_PASSWORD=mypass
./scripts/05-test-data-persistence.sh
```

### Non-Interactive Mode Variables:
For `03-create-superadmin.sh --non-interactive`, set these environment variables:
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
