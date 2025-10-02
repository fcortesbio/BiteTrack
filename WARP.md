# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

BiteTrack is a production-ready RESTful API for small food businesses built with Node.js, Express, and MongoDB. It provides secure multi-user management of sellers, products, customers, and sales with role-based access control and atomic transaction processing.

**Key Features:**
- JWT-based authentication with role-based permissions (user/admin/superadmin)
- Atomic sales transactions with automatic inventory management
- Enterprise security (helmet, rate limiting, bcrypt, CORS)
- Complete audit trails and multi-user support
- Docker containerization for deployment

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

### API Testing
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
```

## Architecture Overview

### Core Components Structure
```
BiteTrack/
├── models/              # Mongoose schemas with business logic
│   ├── Seller.js        # User management with role-based access
│   ├── PendingSeller.js # Two-phase account activation
│   ├── Customer.js      # Customer database (no login access)
│   ├── Product.js       # Inventory with real-time stock tracking
│   ├── Sale.js          # Transaction records with payment status
│   └── PasswordResetToken.js # Secure password recovery
├── controllers/         # Business logic implementation
├── routes/             # API endpoint definitions
├── middleware/         # Authentication, validation, error handling
├── utils/              # JWT generation, validation helpers
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

### Database Relationships
- `Seller.createdBy` → `Seller._id` (supports "Self" for bootstrap superadmin)
- `Sale.customerId` → `Customer._id`
- `Sale.sellerId` → `Seller._id` 
- `Sale.products[].productId` → `Product._id`
- `PasswordResetToken.sellerId` → `Seller._id`

## API Structure

**Base URL:** `http://localhost:3000/bitetrack`

**Authentication endpoints:** `/auth/*`
- `POST /auth/login` - Get JWT token
- `POST /auth/activate` - Activate pending account
- `GET /auth/seller-status?email=x` - **PUBLIC** - Check account status
- `POST /auth/recover` - Generate password reset token (superadmin only)
- `POST /auth/reset` - Reset password with token

**Resource endpoints:** All require authentication
- `/sellers/*` - Staff management (admin+)
- `/customers/*` - Customer database
- `/products/*` - Inventory management  
- `/sales/*` - Transaction processing
- `/reporting/*` - Sales analytics and CSV exports

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

## Testing Resources

- **API Documentation:** `docs/API-documentation.md` (comprehensive endpoint reference)
- **Postman Collection:** `docs/postman-collection.json`
- **Test Data:** `test-data/` directory with sample JSON files
- **Health Check:** `GET /bitetrack/health` (no auth required)