# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

BiteTrack is a **production-ready Enterprise Business Intelligence Platform** for food businesses built with Node.js, Express, and MongoDB. It has evolved from a simple API into a comprehensive business management platform with advanced analytics, regulatory compliance, and professional development infrastructure.

**🚀 Current Status**: **v2.0+ Enterprise Platform** (38 endpoints across 9 business categories)

**🎯 Core Platform Capabilities:**
- **Business Intelligence & Analytics**: Advanced sales reporting with time-series data
- **Food Waste Management**: Regulatory compliance with cost analysis and audit trails
- **Enterprise Authentication**: JWT-based with 3-tier role-based permissions
- **Atomic Transaction Processing**: Real-time inventory management with data integrity
- **Interactive API Documentation**: Professional Swagger UI portal
- **Professional Testing Infrastructure**: Automated scenarios with realistic data
- **Enterprise Security**: Helmet, rate limiting, bcrypt, CORS, comprehensive validation
- **Production Deployment**: Docker containerization with multi-environment support

## Essential Commands

### Development
```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Install dependencies
npm install
```

### Database Setup & Management
```bash
# Check MongoDB connection
mongosh localhost:27017 --eval 'db.adminCommand({ping: 1})'

# Create initial superadmin (CRITICAL FIRST STEP)
node create-superadmin.js

# Connect to database
mongosh mongodb://admin:password@localhost:27017/bitetrack
```

### Docker Operations
```bash
# Build with Docker BuildKit
DOCKER_BUILDKIT=1 docker build . -t bitetrack:latest

# Run container
docker run -d -p 3000:3000 --env-file .env --name bitetrack-api bitetrack:latest

# Health check
curl http://localhost:3000/bitetrack/health
```

### 📚 Interactive API Documentation (NEW)
```bash
# Access professional Swagger UI documentation portal
open http://localhost:3000/api-docs

# Get OpenAPI JSON specification
curl http://localhost:3000/api-docs.json

# API overview and quick start guide
curl http://localhost:3000/
```

### API Testing & Development
```bash
# Login to get JWT token
curl -X POST http://localhost:3000/bitetrack/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Test authenticated endpoint (replace TOKEN)
curl -X GET http://localhost:3000/bitetrack/sellers \
  -H "Authorization: Bearer TOKEN"

# Check account status (public endpoint)
curl "http://localhost:3000/bitetrack/auth/seller-status?email=user@example.com"

# Business Intelligence - Sales Analytics
curl -X GET "http://localhost:3000/bitetrack/reporting/sales/analytics?groupBy=month" \
  -H "Authorization: Bearer TOKEN"

# CSV Export - Multiple formats available
curl -X GET "http://localhost:3000/bitetrack/reporting/sales/export?format=detailed" \
  -H "Authorization: Bearer TOKEN"
```

### 🗑️ Food Waste Management (NEW)
```bash
# Drop inventory for compliance (admin/superadmin only)
curl -X POST http://localhost:3000/bitetrack/inventory-drops \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","quantityToDrop":5,"reason":"expired"}'

# Get waste analytics and cost analysis
curl -X GET http://localhost:3000/bitetrack/inventory-drops/analytics \
  -H "Authorization: Bearer TOKEN"

# View undoable drops (8-hour window)
curl -X GET http://localhost:3000/bitetrack/inventory-drops/undoable \
  -H "Authorization: Bearer TOKEN"
```

### 🧪 Professional Testing Infrastructure
```bash
# Get comprehensive test data status
curl -X GET http://localhost:3000/bitetrack/test-data/status \
  -H "Authorization: Bearer TOKEN"

# Populate realistic test scenarios
curl -X POST http://localhost:3000/bitetrack/test-data/populate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preset":"dev","verbose":true}'

# Run integration tests
npm test
npm run test:coverage
```

## Architecture Overview

### 🏢 Enterprise Platform Architecture (v2.0+)
```
BiteTrack/
├── models/              # Mongoose schemas with business logic
│   ├── Seller.js        # User management with role-based access
│   ├── PendingSeller.js # Two-phase account activation
│   ├── Customer.js      # Customer database (no login access)
│   ├── Product.js       # Inventory with real-time stock tracking
│   ├── Sale.js          # Transaction records with payment status
│   ├── InventoryDrop.js # Food waste compliance and tracking
│   └── PasswordResetToken.js # Secure password recovery
├── controllers/         # Business logic implementation
│   ├── authController.js      # Authentication & authorization
│   ├── sellerController.js    # Staff and user management
│   ├── customerController.js  # Customer relationship management
│   ├── productController.js   # Inventory and catalog management
│   ├── saleController.js      # Transaction processing
│   ├── reportingController.js # 🆕 Business intelligence & analytics
│   ├── inventoryDropController.js # 🆕 Food waste management
│   └── testDataController.js  # 🆕 Professional testing infrastructure
├── routes/             # API endpoint definitions (9 categories, 38 endpoints)
├── middleware/         # Authentication, validation, error handling
├── utils/              # JWT generation, validation helpers
├── config/             # 🆕 Professional configuration management
│   └── swagger.js      # 🆕 Interactive API documentation portal
├── tests/              # 🆕 Integration test suite with Jest + Supertest
├── docs/               # Comprehensive documentation
│   ├── openapi.yaml    # Professional OpenAPI 3.1 specification
│   └── API-documentation.md # Complete endpoint reference
└── create-superadmin.js # Bootstrap script for first user
```

### Authentication & Authorization Architecture

**Three-tier role system:**
- **user**: Basic CRUD operations (products, customers, sales, self-profile)
- **admin**: User permissions + create pending seller accounts
- **superadmin**: Admin permissions + role management + password recovery

**Security flow:**
1. All routes (except login/activate/seller-status) require JWT authentication
2. Middleware chain: `authenticate` → `authorize(['roles'])` → controller
3. Passwords hashed with bcrypt (salt rounds: 12)
4. Rate limiting: 100 requests per 15 minutes per IP

### Account Activation Architecture

**Two-phase activation system prevents unauthorized access:**
1. Admin/SuperAdmin creates `PendingSeller` with basic info
2. New user activates via `/auth/activate` with:
   - Email + Date of Birth + Last Name (verification)
   - Chosen secure password
3. System creates active `Seller` record and marks `PendingSeller` as activated

### Transaction Safety Architecture

**Atomic sales processing using MongoDB transactions:**
- All sales operations wrapped in `mongoose.startSession().withTransaction()`
- Inventory checks and decrements happen atomically
- If any product lacks stock, entire transaction rolls back
- Customer `lastTransaction` updated on successful sale
- Sales track `priceAtSale` for historical accuracy

### Reporting & Analytics Architecture

**Comprehensive sales reporting system:**
- **Analytics endpoint** (`/reporting/sales/analytics`) provides:
  - Time-series data with flexible grouping (hour/day/week/month/year)
  - Top products by revenue and quantity
  - Customer analytics (unique customers, average spend)
  - Payment settlement statistics
- **CSV export endpoint** (`/reporting/sales/export`) supports three formats:
  - `detailed`: Individual product line items with full transaction details
  - `summary`: One row per sale with aggregate information
  - `products`: Product performance metrics and sales statistics
- **Advanced filtering** on all reporting endpoints:
  - Date range filtering with timezone handling
  - Customer/seller filtering
  - Settlement status filtering
- **Optimized MongoDB aggregation pipelines** for performance

### 🗑️ Food Waste Management Architecture (NEW)

**Complete regulatory compliance system:**
- **Inventory drop tracking** with detailed audit trails and cost analysis
- **8-hour undo system** for operational error recovery
- **Compliance reporting** with health department requirements
- **Waste analytics** with pattern identification and cost optimization
- **Admin-only access** (admin/superadmin roles required for all operations)
- **Atomic operations** ensuring data integrity across inventory and waste records

**Key endpoints and capabilities:**
- `POST /inventory-drops` - Record waste with reason codes and financial tracking
- `GET /inventory-drops/analytics` - Comprehensive waste analytics and cost reporting
- `GET /inventory-drops/undoable` - Error recovery management within undo window
- `POST /inventory-drops/{id}/undo` - Reverse accidental drops with audit trail

### 📚 Interactive Documentation Architecture (NEW)

**Professional Swagger UI integration:**
- **Dynamic OpenAPI loading** from existing YAML specification with error handling
- **Custom branded interface** with BiteTrack styling and comprehensive getting started guide
- **Interactive testing environment** for all 38 endpoints with JWT authentication flow
- **Professional presentation** with endpoint categorization and search capabilities
- **Developer experience enhancements** including persistent authorization and request examples

**Key features and endpoints:**
- `GET /api-docs` - Professional interactive documentation portal
- `GET /api-docs.json` - Raw OpenAPI specification for integration
- `GET /` - API overview with quick start guide and platform capabilities

### 🧪 Professional Testing Infrastructure (NEW)

**Enterprise-grade testing capabilities:**
- **Jest + Supertest integration** with MongoDB Memory Server for realistic scenarios
- **Automated test data management** with realistic business scenarios and data relationships
- **Multiple test presets** (minimal, dev, full, bulk) for different testing needs
- **Environment-aware operations** (disabled in production for security)
- **Complete test lifecycle management** including setup, population, and cleanup

**Key testing endpoints:**
- `GET /test-data/status` - Comprehensive database statistics and test data overview
- `POST /test-data/populate` - Realistic scenario generation with configurable presets
- `DELETE /test-data/clean` - Selective data cleanup with preservation options
- `POST /test-data/reset` - Complete database reset to specific scenarios (SuperAdmin only)

### Database Relationships
- `Seller.createdBy` → `Seller._id` (supports "Self" for bootstrap superadmin)
- `Sale.customerId` → `Customer._id`
- `Sale.sellerId` → `Seller._id` 
- `Sale.products[].productId` → `Product._id`
- `PasswordResetToken.sellerId` → `Seller._id`

## 📊 Enterprise API Structure (38 Endpoints)

**Base URL:** `http://localhost:3000/bitetrack`

### 🔐 **Authentication & Authorization** (`/auth/*`)
- `POST /auth/login` - Multi-role authentication system
- `POST /auth/activate` - Secure account activation with multi-factor verification
- `GET /auth/seller-status?email=x` - **PUBLIC** - Account status checking for client apps
- `POST /auth/recover` - Password recovery token generation (superadmin only)
- `POST /auth/reset` - Secure password reset with token validation

### 👤 **User & Staff Management** (`/sellers/*`) - Admin+ Required
- `GET /sellers` - Staff directory and role management
- `POST /sellers/pending` - Professional onboarding workflow
- `PATCH /sellers/{id}` - Self-service profile updates
- `PATCH /sellers/{id}/role` - Role promotion/demotion (superadmin only)
- `DELETE /sellers/{id}` - Account deactivation (superadmin only)

### 🏪 **Customer Relationship Management** (`/customers/*`)
- `GET /customers` - Customer database with transaction history
- `POST /customers` - Customer registration and profile creation
- `POST /customers/import` - Bulk customer import via CSV upload
- `GET /customers/{id}/transactions` - Complete purchase history with analytics
- `PATCH /customers/{id}` - Customer information updates
- `DELETE /customers/{id}` - Customer record management

### 📦 **Inventory & Product Management** (`/products/*`)
- `GET /products` - Real-time inventory status and catalog
- `POST /products` - Product creation with pricing and descriptions
- `PATCH /products/{id}` - Inventory updates and pricing management
- `DELETE /products/{id}` - Product catalog maintenance

### 💳 **Sales & Transaction Processing** (`/sales/*`)
- `GET /sales` - Advanced sales analytics with filtering, pagination, and sorting
- `POST /sales` - Atomic transaction processing with inventory management
- `POST /sales/import` - Bulk sales import via CSV upload
- `GET /sales/{id}` - Detailed transaction information
- `PATCH /sales/{id}/settle` - Payment settlement and tracking

### 📊 **Business Intelligence & Reporting** (`/reporting/*`) - NEW
- `GET /reporting/sales/analytics` - Comprehensive analytics with time-series data
- `GET /reporting/sales/export` - Professional CSV exports (detailed/summary/products)

### 🗑️ **Food Waste Management & Compliance** (`/inventory-drops/*`) - NEW - Admin+ Only
- `POST /inventory-drops` - Waste recording with regulatory compliance
- `GET /inventory-drops` - Waste history with filtering and pagination
- `GET /inventory-drops/{id}` - Detailed drop information and audit trails
- `POST /inventory-drops/{id}/undo` - Error recovery within 8-hour window
- `GET /inventory-drops/undoable` - Operational error management dashboard
- `GET /inventory-drops/analytics` - Cost analysis and waste pattern identification

### 🧪 **Professional Testing Infrastructure** (`/test-data/*`) - Admin+ Only
- `GET /test-data/status` - Development environment monitoring and statistics
- `POST /test-data/populate` - Realistic scenario generation with configurable presets
- `DELETE /test-data/clean` - Selective data cleanup with preservation options
- `POST /test-data/reset` - Complete environment reset (superadmin only)

### ❤️ **System Health & Monitoring** (`/health`)
- `GET /bitetrack/health` - **PUBLIC** - System status and uptime monitoring

## Environment Configuration

**Required environment variables:**
```bash
MONGO_URI=mongodb://admin:password@host:27017/bitetrack
JWT_SECRET=your-super-secure-jwt-secret
PORT=3000
NODE_ENV=production  # Optional
```

## Critical Setup Requirements

1. **MongoDB must be running** on port 27017 before starting the API
2. **Create superadmin first** using `node create-superadmin.js`
3. **Copy generated MongoDB command** into mongosh to insert first user
4. **Get JWT token** via login before accessing any protected endpoints

## Development Notes

### Password Requirements (Enforced in validation)
- Minimum 8 characters
- At least 1 lowercase, 1 uppercase, 1 number, 1 symbol (@$!%*?&)

### Transaction Testing
Sales creation automatically:
- Validates product availability
- Decrements inventory counts
- Calculates total from current product prices
- Records `priceAtSale` for historical accuracy
- Updates customer's `lastTransaction` timestamp

### Error Handling
- Consistent error response format with `error`, `message`, `statusCode`
- Validation errors include `details` array with field-specific messages
- Mongoose validation and custom business logic validation
- Global error handler in `middleware/errorHandler.js`

### Security Features
- Helmet for security headers
- CORS enabled for cross-origin requests
- Rate limiting (100 req/15min per IP)
- JWT tokens with configurable expiration
- Password fields excluded from JSON responses (`select: false`)
- Input validation with express-validator

## 🧪 Enterprise Testing & Documentation Resources

### 📚 **Interactive Documentation Portal**
- **Swagger UI Interface:** `http://localhost:3000/api-docs` - Professional interactive documentation
- **OpenAPI Specification:** `http://localhost:3000/api-docs.json` - Complete API specification
- **Getting Started Guide:** `http://localhost:3000/` - API overview and quick start

### 📄 **Comprehensive Documentation**
- **Complete API Reference:** `docs/API-documentation.md` - All 38 endpoints documented
- **OpenAPI 3.1 Specification:** `docs/openapi.yaml` - Professional API specification
- **Postman Collection:** `docs/postman-collection.json` - Ready-to-use API testing
- **Strategic Roadmap:** `ROADMAP.md` - Development planning and priorities

### 🧪 **Professional Testing Infrastructure**
- **Integration Tests:** `tests/` directory with Jest + Supertest + MongoDB Memory Server
- **Test Coverage:** `npm run test:coverage` - Comprehensive test coverage reports
- **Realistic Test Data:** `test-data/` directory with business scenario samples
- **Automated Test Management:** `/test-data/*` API endpoints for scenario control

### 📊 **Monitoring & Health Checks**
- **System Health:** `GET /bitetrack/health` - **PUBLIC** - No authentication required
- **Development Monitoring:** `GET /test-data/status` - Database and environment statistics
- **Performance Testing:** Integration test suite with realistic business scenarios

### 🏢 **Enterprise Development Resources**
- **Docker Orchestration:** `docker-compose.yml` - Complete stack deployment
- **Environment Management:** Multiple environment configurations (dev/staging/production)
- **Professional Logging:** Morgan middleware with request/response tracking
- **Security Monitoring:** Rate limiting, authentication, and authorization audit trails

**🎆 Platform Status**: Production-ready enterprise business intelligence platform with 38 endpoints across 9 business categories, comprehensive testing infrastructure, and professional documentation portal!
