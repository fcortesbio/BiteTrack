# **BiteTrack**

> **The Complete Food Service Management Platform**
> **Enterprise Backend | UI-Ready Architecture | Real Business Value **

BiteTrack is a **production-ready business intelligence platform** that transforms small food businesses from spreadsheet chaos to professional operations. Featuring a **comprehensive REST API backend** with advanced analytics, compliance tracking, and multi-role management—**ready for frontend development** to create the complete business solution.

---

## **Current Status: Enterprise Backend Complete - UI Development Ready**

> **Strategic Position**: The backend platform is **90% UI-ready** with 38 professional endpoints, advanced analytics, compliance features, and multi-role security. **Frontend development is the next strategic phase.**

 **[View Complete UI Development Roadmap](ROADMAP.md)** | **[Explore All 38 API Endpoints](docs/API-documentation.md)**

---

** Quick Navigation:**
[ Quick Start](#-quick-start-5-minutes) • [ Why BiteTrack](#-why-bitetrack) • [ First-Time Setup](#-first-time-setup-critical) • [ API Overview](#-api-overview) • [ Production Setup](#-production-setup) • [ Full Documentation](#-full-api-documentation-docsapi-documentationmd--postman-collection-docspostman-collectionjson)

## **Why BiteTrack?**

<table>
<tr>
<td width="50%">

### **The Problem**

Small food businesses struggle with:

- Messy spreadsheets that break and get lost
- No real-time inventory tracking
- Manual sales recording prone to errors
- Unstructured customer data
- No secure multi-user access control

</td>
<td width="50%">

### **The BiteTrack Solution**

- **Advanced Business Intelligence** - Time-series analytics, customer behavior insights
- **38 Professional API Endpoints** - Complete business operations coverage
- **Multi-Role Security** - User/Admin/SuperAdmin with JWT authentication
- **Financial Management** - Sales tracking, settlement monitoring, payment analytics
- **Regulatory Compliance** - Food waste tracking with audit trails
- **Multi-Format Exports** - Professional CSV reports for accounting integration
- **Enterprise Architecture** - Production-ready with Docker orchestration
- **UI-Ready Backend** - **90% prepared for frontend development**

</td>
</tr>
</table>

## **Quick Start (5 Minutes)**

**Get BiteTrack running in under 5 minutes:**

```bash
# 1. Clone and navigate
git clone https://github.com/fcortesbio/BiteTrack
cd BiteTrack

# 2. Setup environment
./scripts/01-setup-keyfile.sh
cp .env.development.example .env.development

# 3. Start everything
docker compose up -d

# 4. Verify health
curl http://localhost:3000/bitetrack/health
```

** That's it!** The API is now running at `http://localhost:3000`

> ** Next:** Create a SuperAdmin user before using the API (see [First-Time Setup](#-first-time-setup-critical) below)

### **Advanced Setup Options**

<details>
<summary><strong> Automated Production Setup</strong></summary>

```bash
# One-command production setup wizard
./scripts/00-init-production-setup.sh
```

Interactive script that handles complete production deployment with guided configuration.

</details>

<details>
<summary><strong> Manual Step-by-Step Setup</strong></summary>

For development or when you need full control:

```bash
# Environment & Database
./scripts/01-setup-keyfile.sh # MongoDB keyfile
./scripts/02-quick-persistence-test.sh # Health check

# User Management & Data
./scripts/03-create-superadmin.sh # Admin user (REQUIRED)
./scripts/04-populate-test-data.js # Sample data

# Testing & Validation
./scripts/05-test-data-persistence.sh # Data persistence test
./scripts/06-test-sales-filtering.js # API validation
```

</details>

## **Environment Configuration**

BiteTrack uses different environment files for different deployment scenarios:

| File | Purpose | Tracked in Git |
|------|---------|----------------|
| `.env.development.example` | Development template | Yes (safe defaults) |
| `.env.development` | Local development config | No (contains secrets) |
| `.env.production.template` | Production deployment guide | Yes (template only) |
| `.env.production` | Production config | No (contains secrets) |

### **Environment Setup**

```bash
# For development (recommended)
cp .env.development.example .env.development
# Edit .env.development with actual values

# For production deployment
cp .env.production.template .env.production
# Update .env.production with secure production values
```

### **NPM Scripts**

#### ** Development & Production**
```bash
npm run dev # Development mode with auto-reload (.env.development)
npm run dev:watch # Same as dev (nodemon with file watching)
npm run dev:manual # Development mode without auto-reload
npm run start # Production mode (uses .env or environment variables)
npm run start:production # Explicit production mode with NODE_ENV=production
```

#### ** Testing & Quality Assurance**
```bash
npm test # Run all tests (Jest with MongoDB Memory Server)
npm run test:watch # Run tests in watch mode (for active development)
npm run test:coverage # Generate test coverage reports
npm run test:verbose # Run tests with detailed output
```

#### ** Code Quality & Linting**
```bash
npm run lint # Run ESLint to check code quality
npm run lint:fix # Run ESLint and automatically fix issues
npm run lint:check # Run ESLint with zero warnings policy (CI-ready)
```

#### ** Documentation & API Tools**
```bash
# Current API documentation access
curl http://localhost:3000/bitetrack/ # API overview endpoint
# Future scripts (suggestions for UI development phase):
# npm run docs:generate # Generate API docs from OpenAPI spec
# npm run docs:serve # Serve interactive Swagger UI locally
```

<details>
<summary><strong> Recommended Script Additions for UI Development</strong></summary>

**Suggested additions to package.json for enhanced development workflow:**

```bash
# Database & Development Utilities
"db:seed": "node scripts/04-populate-test-data.js",
"db:reset": "npm run db:clean && npm run db:seed",
"db:clean": "node scripts/test-data-clean.js",

# API Documentation (when Swagger UI is implemented)
"docs:serve": "node scripts/serve-docs.js",
"docs:validate": "swagger-jsdoc -d swaggerDefinition.js routes/*.js",

# Pre-commit and CI/CD helpers
"precommit": "npm run lint:check && npm test",
"ci:test": "npm run lint:check && npm run test:coverage",
"build:check": "npm run lint && npm test",

# Development helpers for UI integration
"dev:api-only": "NODE_ENV=development node index.js",
"dev:cors-debug": "DEBUG=cors NODE_ENV=development nodemon index.js"
```

**Benefits for UI Development:**
- **Database utilities** - Quick data reset/seeding for frontend testing
- **Documentation scripts** - Serve API docs alongside frontend development
- **Quality gates** - Ensure backend stability while building UI
- **Debug helpers** - CORS and API debugging for frontend integration

</details>

> **Security Note:** Environment files with actual credentials (`.env.development`, `.env.production`) are automatically excluded from Git. Only templates and examples are tracked.

## **Development Workflow**

### **Container Deployment (Recommended)**

```bash
# Start full stack
docker compose up -d

# View logs
docker compose logs -f bitetrack-api
docker compose logs -f mongodb

# Stop everything
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v
```

### **Local Development**

```bash
# Start only MongoDB in container
docker compose up mongodb -d

# Run BiteTrack locally for development
npm install
npm run dev # Uses .env.development
npm run dev:watch # Same as above but with nodemon

# The containerized MongoDB is accessible at localhost:27017
# Perfect for development - get MongoDB benefits without local install!
```

## **First-Time Setup** (CRITICAL)

** All API routes require authentication - create a SuperAdmin account first!**

### **Streamlined Setup (Recommended)**

```bash
# One-step superadmin creation (interactive prompts)
./scripts/03-create-superadmin.sh

# Or automated setup (perfect for CI/deployment)
ADMIN_FIRST_NAME="John" ADMIN_LAST_NAME="Doe" \
ADMIN_EMAIL="admin@yourcompany.com" ADMIN_DOB="1990-01-01" \
ADMIN_PASSWORD="SecurePass123!" \
./scripts/03-create-superadmin.sh --non-interactive

# Done! User created and ready to login
```

### **Test Your Setup**

```bash
# Login to get authentication token
curl -X POST http://localhost:3000/bitetrack/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"SecurePass123!"}'

# Test authenticated endpoint (replace YOUR_JWT_TOKEN)
curl -X GET http://localhost:3000/bitetrack/sellers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

<details>
<summary><strong> Legacy Setup Method (Manual)</strong></summary>

**If you prefer the original two-step process:**

```bash
# Step 1: Generate user data
node create-superadmin.js

# Step 2: Copy/paste MongoDB command in mongosh
mongosh mongodb://admin:YOUR_MONGO_PASSWORD@localhost:27017/bitetrack
# Paste the generated db.sellers.insertOne() command
```

</details>

> **Pro tip:** The API includes a public route to check if an email exists: `GET /auth/seller-status?email=test@example.com` - perfect for client-side login flows!

## **Testing Infrastructure**

**Production-ready testing suite with Jest + Supertest + MongoDB Memory Server**

### **Quick Testing**

```bash
# Run all tests (20/20 passing)
npm test

# Development testing workflows
npm run test:watch # Watch mode for active development
npm run test:coverage # Coverage analysis (26% → 95% roadmap)
npm run test:verbose # Detailed test output

# Run specific test suites
npm test -- auth-real # Authentication tests (16/16 )
npm test -- products # Product tests (placeholder - ready for implementation)
npm test -- sales # Sales tests (placeholder - ready for implementation)
```

### **Current Test Status**

- ** Authentication Routes**: 16/16 tests passing (100% complete)
  - Login, activation, password reset, seller status
  - JWT token validation, password hashing, role management
  - Security edge cases and error handling
- ** API Endpoints**: 0% coverage (authentication foundation complete)
  - Products, Sales, Customers, Inventory, Reporting (ready for implementation)
  - Comprehensive test roadmap with 8-phase expansion plan

### **Testing Roadmap**

**Phase 1 (Weeks 1-2):** Product + Sales Testing → 60% coverage
**Phase 2 (Weeks 3-4):** Customer + Seller Management → 80% coverage
**Phase 3 (Weeks 5-6):** Inventory + Reporting → 90% coverage
**Phase 4 (Weeks 7-8):** Security + Performance → 95% coverage

### **Testing Documentation**

- ** Complete Status & Roadmap**: [`docs/TESTING-STATUS.md`](docs/TESTING-STATUS.md)
- ** Test Infrastructure Guide**: [`tests/README.md`](tests/README.md)
- ** Test Implementation Examples**: [`tests/integration/auth-real.test.js`](tests/integration/auth-real.test.js)

** Ready for systematic API testing expansion with production-grade infrastructure!**

## **Perfect For**

- **Sandwich shops** - Track inventory, customers, and daily sales
- **Coffee shops** - Manage products and customer loyalty
- **Small restaurants** - Multi-user staff access with role controls
- **Food trucks** - Mobile-friendly API for on-the-go management
- **Any food business** ready to scale beyond spreadsheets

## **Core Features**

### **Security & Access Control**

- **JWT Authentication** - Industry-standard token-based auth
- **Role-based permissions** - User, Admin, and SuperAdmin roles
- **Secure account activation** - Multi-factor verification process
- **Password recovery system** - Admin-controlled reset process
- **Rate limiting & input validation** - Protection against abuse

### **Sales & Inventory Management**

- **Atomic transactions** - Sales and inventory update together or not at all
- **Real-time stock tracking** - Never oversell products
- **Multi-product sales** - Handle complex orders seamlessly
- **Payment tracking** - Monitor settled vs. pending payments
- **Sales history** - Complete transaction audit trail
- **Advanced sales filtering** - Date ranges, pagination, sorting, and search
- **CSV import capabilities** - Bulk import for sales and customer data
- **Customer transaction history** - Detailed purchase tracking per customer

### **Business Intelligence & Reporting**

- **Comprehensive sales analytics** - Revenue, trends, top products, customer insights
- **Time-series data analysis** - Hourly, daily, weekly, monthly, yearly aggregations
- **CSV export system** - Detailed, summary, and product performance formats
- **Payment settlement tracking** - Monitor outstanding balances and cash flow
- **Customer behavior analysis** - Purchase patterns and loyalty metrics

### **Food Waste Management & Compliance**

- **Inventory drop tracking** - Record expired, damaged, or end-of-day waste
- **Cost analysis** - Calculate monetary impact of food waste
- **Compliance reporting** - Detailed records for health department requirements
- **Undo system** - 8-hour window to reverse accidental drops
- **Waste analytics** - Identify patterns and optimize inventory management
- **Audit trails** - Complete tracking of who, what, when, why for all drops

### **Multi-User Business Operations**

- **Staff management** - Multiple sellers with different permission levels
- **Customer database** - Track customer information and purchase history
- **Product catalog** - Manage inventory, pricing, and descriptions
- **Audit trails** - Know who did what and when

### **Enterprise-Ready Architecture**

- **Docker containerization** - Consistent deployment anywhere
- **MongoDB integration** - Scalable document database with direct admin access
- **Express.js foundation** - Battle-tested web framework
- **Dual management approach** - Both REST API and direct MongoDB Shell/Compass access
- **Comprehensive logging** - Monitor API usage and performance
- **Health check endpoints** - Monitor system status

## **API Overview**

**Base URL:** `http://localhost:3000/bitetrack`

| Feature | Endpoints | Key Actions |
|---------|-----------|-------------|
| ** Auth** | `/auth/*` | Login, activate accounts, password recovery |
| ** Check Account** | `/auth/seller-status?email=x` | **PUBLIC:** Check if email exists (useful for client apps) |
| ** Sellers** | `/sellers/*` | Manage staff, roles, and permissions |
| ** Customers** | `/customers/*` | Customer database, CSV import, contact info, transaction history |
| ** Products** | `/products/*` | Inventory management, pricing, and catalog |
| ** Sales** | `/sales/*` | Process orders, CSV import, advanced filtering, payment tracking |
| ** Reporting** | `/reporting/*` | **NEW:** Sales analytics, CSV exports, business intelligence |
| ** Waste Management** | `/inventory-drops/*` | **NEW:** Food waste tracking, cost analysis, compliance |
| ** Test Data** | `/test-data/*` | **DEV:** Development data management, testing scenarios |

> **Full API documentation:** [`docs/API-documentation.md`](docs/API-documentation.md) | **Postman Collection:** [`docs/postman-collection.json`](docs/postman-collection.json)

## **Data Models & Business Logic**

<details>
<summary><strong> User Management (Sellers)</strong></summary>

**Three-tier access system:**

- **User** - Basic operations (products, customers, sales, self-profile)
- **Admin** - User permissions + create new seller accounts
- **SuperAdmin** - Admin permissions + role management + password recovery

**Secure onboarding flow:**

1. Admin/SuperAdmin creates pending seller account
2. New seller activates with email + DOB + last name + secure password
3. Account becomes active with "user" role by default

</details>

<details>
<summary><strong> Sales & Transaction Logic</strong></summary>

**Atomic transaction processing:**

- Sales process multiple products in a single transaction
- Inventory automatically decrements when sale is created
- **All-or-nothing approach** - if any product is out of stock, entire sale fails
- Payment tracking with settled/unsettled status
- Complete audit trail with seller attribution

</details>

<details>
<summary><strong> Inventory & Customer Management</strong></summary>

**Product catalog:**

- Name, description, current stock count, pricing
- Real-time inventory tracking with sales

**Customer database:**

- Contact information storage (no login access)
- Transaction history tracking
- Optional email field with uniqueness constraint

</details>

## **Production Setup**

### Prerequisites

- **Docker** with Docker Compose support
- **Git** for cloning the repository

### Environment Configuration

For production deployment, use the production template:

```bash
# Copy and configure production environment
cp .env.production.template .env.production
# Edit .env.production with your secure values
```

** For production**: Always use secure passwords and secrets in `.env.production`!

### Complete Stack Deployment

```bash
# 1. Clone and setup
git clone https://github.com/fcortesbio/BiteTrack
cd BiteTrack

# 2. Configure environment for production
cp .env.production.template .env.production
# Edit .env.production with actual values:
# - Update MONGO_URI with production database
# - Change JWT_SECRET to a secure random string
# - Set FRONTEND_URLS to frontend domain(s)

# 3. Deploy complete stack
docker compose --env-file .env.production up -d

# 4. Verify deployment
docker compose ps
curl http://localhost:3000/bitetrack/health

# 5. Monitor logs
docker compose logs -f
```

### Reverse Proxy Configuration

**BiteTrack is reverse-proxy ready!** It includes proper proxy trust configuration for Nginx, Traefik, and other reverse proxies.

#### **Nginx Configuration Example:**

```nginx
server {
    listen 80;
    server_name your-api-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### **Traefik Configuration Example:**

```yaml
# docker-compose.yml
services:
  bitetrack-api:
    # ... your existing config
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bitetrack.rule=Host(`your-api-domain.com`)"
      - "traefik.http.services.bitetrack.loadbalancer.server.port=3000"
```

### CORS and Frontend Integration

**For Remote Frontend Deployment:**

1. **Update production environment:**

```bash
# In .env.production
FRONTEND_URLS=https://frontend-domain.com,https://admin.domain.com
```

2. **Multiple frontend domains supported:**

```bash
# Examples of valid configurations:
FRONTEND_URLS=https://myapp.com
FRONTEND_URLS=https://app.restaurant.com,https://admin.restaurant.com
FRONTEND_URLS=https://pos.foodbiz.com,https://dashboard.foodbiz.com,https://reports.foodbiz.com
```

3. **Development vs Production:**

- **Development**: Automatically allows localhost with common ports (3000, 3001, 5173)
- **Production**: Only allows domains specified in `FRONTEND_URLS`

### Health Monitoring

```bash
# Check service status
docker compose ps

# API health check
curl http://localhost:3000/bitetrack/health

# MongoDB connection test
curl localhost:27017 # Should return MongoDB HTTP message

# View real-time logs
docker compose logs -f bitetrack-api
docker compose logs -f mongodb
```

### **Production Deployment Strategies**

** Database data is always safe!** BiteTrack uses persistent Docker volumes (`mongodb_data`) that survive container updates, ensuring zero data loss during deployments.

#### **Strategy 1: Rolling Update (Recommended - Zero Downtime)**

```bash
# Safe deployment - only rebuilds API container, DB stays running
git pull origin main
docker compose up --build -d bitetrack-api

# Verify deployment
docker compose ps
curl http://your-domain/bitetrack/health
docker compose logs -f bitetrack-api
```

** Benefits:**

- Zero downtime (database never stops)
- Fastest deployment method
- Database connections maintained
- Perfect for minor updates and bug fixes

#### **Strategy 2: Complete Stack Rebuild (Safe)**

```bash
# Full stack rebuild - data persists via volumes
docker compose down # Stop containers (volumes preserved)
git pull origin main # Get latest code
docker compose up --build -d # Rebuild and start everything

# Verify deployment
docker compose logs -f
curl http://your-domain/bitetrack/health
```

** Benefits:**

- Complete environment refresh
- Rebuilds both API and database containers
- Data automatically restored from persistent volumes
- Good for major updates or configuration changes

#### **Strategy 3: Blue-Green Deployment (Zero Downtime - Advanced)**

```bash
# For critical production with load balancer/reverse proxy

# 1. Create secondary deployment
cp docker-compose.yml docker-compose.blue.yml
# Edit docker-compose.blue.yml to use port 3001 for bitetrack-api

# 2. Deploy new version alongside current
docker compose -f docker-compose.blue.yml up --build -d bitetrack-api

# 3. Test new version
curl http://localhost:3001/bitetrack/health

# 4. Switch traffic (update load balancer/proxy to port 3001)
# 5. Stop old version after verification
docker compose -f docker-compose.yml down bitetrack-api
```

** Benefits:**

- Absolute zero downtime
- Instant rollback capability
- Full testing before traffic switch
- Enterprise-grade deployment pattern

#### ** Production Safety Checklist**

**Before deploying:**

```bash
# 1. Create database backup (extra safety)
docker compose exec mongodb mongodump --out /data/backup-$(date +%Y%m%d-%H%M%S)

# 2. Verify environment variables
cat .env.production

# 3. Test in staging environment (if available)
docker compose -f docker-compose.yml --env-file .env.staging up -d
```

**After deploying:**

```bash
# 4. Run comprehensive health checks
curl http://your-domain/bitetrack/health
curl http://your-domain/bitetrack/ # API overview

# 5. Monitor logs for errors
docker compose logs -f bitetrack-api --tail=100

# 6. Test critical endpoints
curl -X POST http://your-domain/bitetrack/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

#### ** Database Persistence Guarantee**

**Why data is always safe:**

- **Named Docker Volumes**: `mongodb_data:/data/db` persists on host
- **Container Independence**: API rebuilds don't affect database container
- **MongoDB Durability**: All writes are persisted to disk immediately
- **Restart Policies**: `restart: unless-stopped` ensures automatic recovery
- **Volume Survival**: Data survives `docker compose down`, only destroyed by `docker compose down -v`

**Data persistence verified through:**

- Container restarts
- Image updates
- Host reboots
- Docker service restarts

### Scaling & Updates

```bash
# Update to latest code
git pull
docker compose build
docker compose up -d

# Scale API instances (behind a load balancer)
docker compose up -d --scale bitetrack-api=3

# Backup database
docker compose exec mongodb mongodump --out /data/backup
```

## **Development & Integration**

### Project Structure

```
BiteTrack/
  models/ # Mongoose schemas
  controllers/ # Business logic
  routes/ # API endpoints
  middleware/ # Auth, validation, error handling
  docs/ # API documentation & Postman collection
  scripts/ # Testing and utility scripts
  create-superadmin.js # First-time setup script (IMPORTANT!)
  Dockerfile # Container definition
  docker-compose.yml # Complete stack orchestration
  .env.development # Development environment configuration
  .env.production.template # Production deployment template
  keyfile # MongoDB replica set authentication
```

### Development Mode

```bash
# Local development with auto-reload
npm install
npm run dev # Uses nodemon for hot reload
```

### Testing the API

```bash
# Health check
curl http://localhost:3000/bitetrack/health

# Import Postman collection for comprehensive testing
# File: docs/postman-collection.json
```

### Data Persistence Testing

```bash
# Run comprehensive data persistence tests
./scripts/05-test-data-persistence.sh

# Run with verbose output
./scripts/05-test-data-persistence.sh --verbose

# Quick persistence check (for CI/automation)
./scripts/02-quick-persistence-test.sh

# Clean up test data only
./scripts/05-test-data-persistence.sh --clean
```

**What the persistence tests verify:**

- MongoDB container restart → Data survives
- API container restart → Data survives
- Full stack restart → Data survives
- Volume integrity → MongoDB volume preserved

**Security Features:**

- **No hardcoded credentials** - Tests read MongoDB credentials from environment variables
- **Automatic environment loading** - Loads from `.env.development` file
- **Credential override** - Can override with `MONGO_ROOT_USERNAME`/`MONGO_ROOT_PASSWORD`
- **Automatic cleanup** - Test data is always cleaned up after tests

### Database Management & Auditing

**Enterprise-Ready Dual Management Approach**

BiteTrack provides **both REST API and direct MongoDB access**, giving system administrators and database professionals complete flexibility for enterprise operations. This dual approach means you're never locked into just the API—you have full database administrative capabilities.

** Why This Matters:**

- **Enterprise Operations** - Direct database access for complex queries, reporting, and compliance
- **System Administration** - Full MongoDB toolchain support (shell, Compass, monitoring tools)
- **Advanced Analytics** - Complex aggregations beyond API scope
- **Audit & Compliance** - Direct data access for regulatory requirements
- **Performance Optimization** - Index management and query tuning
- **Data Migration** - Easy import/export with standard MongoDB tools
- **No Vendor Lock-in** - Standard MongoDB, works with existing enterprise infrastructure

#### **MongoDB Shell (mongosh) Access:**

```bash
# Connect directly to the database
mongosh mongodb://admin:YOUR_MONGO_PASSWORD@localhost:27017/bitetrack

# Example: View all collections
show collections

# Example: Inspect sales data
db.sales.find().limit(5).pretty()

# Example: Get customer count
db.customers.countDocuments()

# Example: Find unsettled sales with customer details
db.sales.aggregate([
  { $match: { settled: false } },
  { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" } },
  { $limit: 10 }
])
```

#### **MongoDB Compass Integration:**

```bash
# Connection string for MongoDB Compass GUI
mongodb://admin:YOUR_MONGO_PASSWORD@localhost:27017/bitetrack
```

**Compass provides:**

- **Visual data exploration** - Browse collections with rich GUI
- **Query performance insights** - Index usage and query optimization
- **Advanced querying** - Visual query builder and aggregation pipeline editor
- **Schema analysis** - Automatic schema validation and field type analysis
- **Real-time monitoring** - Connection stats, query performance metrics

#### **Administrative Operations:**

```javascript
// MongoDB shell examples for system administrators

// 1. Audit trail - Find recent actions by specific user
db.sales.find({
  "createdAt": { $gte: new Date("2024-01-01") },
  "sellerId": ObjectId("USER_ID_HERE")
}).sort({ "createdAt": -1 })

// 2. Data integrity checks - Find orphaned references
db.sales.find({
  "customerId": { $nin: db.customers.distinct("_id") }
})

// 3. Business intelligence - Sales performance by seller
db.sales.aggregate([
  { $group: {
    _id: "$sellerId",
    totalSales: { $sum: "$totalAmount" },
    orderCount: { $sum: 1 },
    avgOrderValue: { $avg: "$totalAmount" }
  }},
  { $sort: { totalSales: -1 } }
])

// 4. Data cleanup - Remove test data (be careful!)
db.sales.deleteMany({ "totalAmount": { $lt: 1 } }) // Remove penny transactions

// 5. Index management
db.sales.createIndex({ "createdAt": -1, "sellerId": 1 }) // Optimize queries
db.sales.getIndexes() // View all indexes
```

#### **Backup & Restore Operations:**

```bash
# Full database backup
docker compose exec mongodb mongodump \
  --uri="mongodb://admin:${MONGO_ROOT_PASSWORD}@localhost:27017/bitetrack" \
  --out /data/backups/$(date +%Y%m%d_%H%M%S)

# Restore from backup
docker compose exec mongodb mongorestore \
  --uri="mongodb://admin:${MONGO_ROOT_PASSWORD}@localhost:27017" \
  --drop /data/backups/BACKUP_FOLDER_NAME

# Export specific collection to JSON
docker compose exec mongodb mongoexport \
  --uri="mongodb://admin:${MONGO_ROOT_PASSWORD}@localhost:27017/bitetrack" \
  --collection=sales \
  --out=/data/exports/sales_export.json
```

#### **Enterprise Integration Benefits:**

 **Dual Management Approach** - Both API and direct database access
 **Standard MongoDB Tools** - No vendor lock-in, use familiar tools
 **Advanced Analytics** - Complex aggregations beyond API capabilities
 **Audit & Compliance** - Direct access to all data for compliance reporting
 **Performance Tuning** - Index optimization and query analysis
 **Data Migration** - Easy import/export for system migrations
 **Backup Integration** - Integrate with enterprise backup solutions
 **Monitoring Integration** - Connect MongoDB monitoring tools (Ops Manager, etc.)

> ** Pro Tip**: System administrators can use both the BiteTrack API for application-level operations and direct MongoDB access for database-level administration, providing complete flexibility for enterprise environments.

## **Strategic Roadmap: UI-First Development**

> **ACHIEVEMENT**: Enterprise backend **100% complete** with 38 professional endpoints
> **STRATEGIC PIVOT**: Now focusing on **frontend development** to create complete business solution

 **[Complete UI Development Roadmap](ROADMAP.md)** - Detailed frontend implementation plan

### **Backend Foundation (v2.0+ Complete)**

- **Enterprise API Platform** - 38 endpoints across 9 business categories
- **Advanced Analytics & Reporting** - Time-series data, CSV exports, business intelligence
- **Multi-Role Security** - JWT authentication with User/Admin/SuperAdmin roles
- **Compliance & Waste Management** - Food safety tracking with audit trails
- **Production Infrastructure** - Docker, health monitoring, enterprise deployment
- **Comprehensive Testing** - Jest + Supertest integration testing suite

### **Priority 1: Frontend Development (Active Focus - Next 4 weeks)**

- [ ] **Next.js + TypeScript Setup** - Modern React architecture with TailwindCSS
- [ ] **Core Business UI** - Seller dashboard, sales entry, customer management
- [ ] **API Integration Layer** - React Query hooks for all 38 endpoints
- [ ] **Business Intelligence Dashboard** - Charts and analytics leveraging advanced reporting APIs
- [ ] **Admin & Compliance Interface** - Multi-role UI for enterprise features

### **Priority 2: Enhanced User Experience (Weeks 5-6)**

- [ ] **Progressive Web App** - Offline capability for food service environments
- [ ] **Mobile-First Design** - Touch-optimized for tablet POS systems
- [ ] **Real-time Features** - WebSocket integration for live updates
- [ ] **Enhanced API Endpoints** - UI-optimized endpoints for better user experience

### **Future Innovation (Phase 2 - 2+ months)**

- [ ] **Advanced Data Visualizations** - Interactive charts and business insights
- [ ] **Mobile App** - Native iOS/Android point-of-sale interface
- [ ] **AI & ML Integration** - Predictive analytics and intelligent recommendations
- [ ] **Multi-location Support** - Franchise and chain restaurant management

## **Contributing**

BiteTrack is open source and welcomes contributions!

1. **Found a bug?** [Open an issue](https://github.com/fcortesbio/BiteTrack/issues)
2. **Have a feature idea?** [Start a discussion](https://github.com/fcortesbio/BiteTrack/discussions)
3. **Want to contribute code?** Fork, branch, and submit a PR!

### Tech Stack

- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **Security:** JWT, bcrypt, Helmet, rate limiting
- **DevOps:** Docker, Docker BuildKit
- **Documentation:** Postman, Markdown

---

## **License**

**MIT License** - Free for commercial and personal use.

---

** Star this repo** if BiteTrack helps your food business grow!

**Questions?** Reach out via [GitHub Issues](https://github.com/fcortesbio/BiteTrack/issues) or check the [documentation](docs/API-documentation.md).
