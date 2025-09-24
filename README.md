# 🍔 **BiteTrack**

> **Transform your food business from spreadsheet chaos to structured success**

BiteTrack is a production-ready RESTful API that empowers small food businesses to **ditch the spreadsheets** and embrace professional inventory, sales, and customer management. Built with Express.js, MongoDB, and enterprise-grade security.

## 🎯 **Why BiteTrack?**

**The Problem:** Small food businesses struggle with:
- 📊 Messy spreadsheets that break and get lost
- 🤔 No real-time inventory tracking
- 📱 Manual sales recording prone to errors
- 👥 Unstructured customer data
- 🔒 No secure multi-user access control

**The Solution:** BiteTrack provides:
- ✅ **Real-time inventory management** - Never oversell again
- ✅ **Atomic sales transactions** - Complete data integrity
- ✅ **Multi-user support** with role-based permissions
- ✅ **Customer relationship tracking** - Build lasting connections
- ✅ **Docker-ready deployment** - Get running in minutes
- ✅ **JWT-secured API** - Enterprise-level security

## 🚀 **Quick Start (Docker Compose)**

```bash
# 1. Clone and setup
git clone https://github.com/fcortesbio/BiteTrack
cd BiteTrack

# 2. Copy development environment template
cp .env.example .env.development
# Edit .env.development with your settings if needed

# 3. Start complete stack (MongoDB + BiteTrack API)
docker compose up -d

# 4. Verify everything is running
docker compose ps
curl http://localhost:3000/bitetrack/health

# 🎉 API ready at http://localhost:3000
# 🍃 MongoDB available at localhost:27017
```

## ⚙️ **Environment Configuration**

BiteTrack uses different environment files for different deployment scenarios:

| File | Purpose | Tracked in Git |
|------|---------|----------------|
| `.env.example` | 📝 Template for developers | ✅ Yes (safe defaults) |
| `.env.development` | 👨‍💻 Local development config | ❌ No (contains secrets) |
| `.env.production.template` | 🏗️ Production deployment guide | ✅ Yes (template only) |

### **Setup Your Environment**
```bash
# For development (recommended)
cp .env.example .env.development
# Edit .env.development with your actual values

# For production deployment
cp .env.production.template .env.production
# Update .env.production with secure production values
```

### **NPM Scripts**
```bash
npm run dev          # Development mode with .env.development
npm run dev:watch    # Development with file watching (nodemon)
npm run start        # Production mode (uses .env or environment variables)
```

> 🔒 **Security Note:** Environment files with actual credentials (`.env.development`, `.env.production`) are automatically excluded from Git. Only templates and examples are tracked.

## 🛠️ **Development Workflow**

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
npm run dev          # Uses .env.development
npm run dev:watch    # Same as above but with nodemon

# The containerized MongoDB is accessible at localhost:27017
# Perfect for development - get MongoDB benefits without local install!
```

## 🔑 **First-Time Setup** (CRITICAL)

**⚠️ All API routes require authentication - you need a SuperAdmin account first!**

### 🚀 **Streamlined Setup (Recommended)**
```bash
# One-step superadmin creation (interactive prompts)
./scripts/create-superadmin.sh

# Or automated setup (perfect for CI/deployment)
ADMIN_FIRST_NAME="John" ADMIN_LAST_NAME="Doe" \
ADMIN_EMAIL="admin@yourcompany.com" ADMIN_DOB="1990-01-01" \
ADMIN_PASSWORD="SecurePass123!" \
./scripts/create-superadmin.sh --non-interactive

# 🎉 Done! User created and ready to login
```

### 🧪 **Test Your Setup**
```bash
# Login to get your authentication token
curl -X POST http://localhost:3000/bitetrack/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"SecurePass123!"}'

# Test authenticated endpoint (replace YOUR_JWT_TOKEN)
curl -X GET http://localhost:3000/bitetrack/sellers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

<details>
<summary><strong>📜 Legacy Setup Method (Manual)</strong></summary>

**If you prefer the original two-step process:**

```bash
# Step 1: Generate user data
node create-superadmin.js

# Step 2: Copy/paste MongoDB command in mongosh
mongosh mongodb://admin:supersecret@localhost:27017/bitetrack
# Paste the generated db.sellers.insertOne() command
```

</details>

> 💡 **Pro tip:** The API includes a public route to check if an email exists: `GET /auth/seller-status?email=test@example.com` - perfect for client-side login flows!

## 💼 **Perfect For**

- 🥪 **Sandwich shops** - Track inventory, customers, and daily sales
- ☕ **Coffee shops** - Manage products and customer loyalty
- 🍕 **Small restaurants** - Multi-user staff access with role controls
- 🚚 **Food trucks** - Mobile-friendly API for on-the-go management
- 📦 **Any food business** ready to scale beyond spreadsheets

## ⚡ **Core Features**

### 🛡️ **Security & Access Control**
- **JWT Authentication** - Industry-standard token-based auth
- **Role-based permissions** - User, Admin, and SuperAdmin roles
- **Secure account activation** - Multi-factor verification process
- **Password recovery system** - Admin-controlled reset process
- **Rate limiting & input validation** - Protection against abuse

### 💰 **Sales & Inventory Management**
- **Atomic transactions** - Sales and inventory update together or not at all
- **Real-time stock tracking** - Never oversell products
- **Multi-product sales** - Handle complex orders seamlessly
- **Payment tracking** - Monitor settled vs. pending payments
- **Sales history** - Complete transaction audit trail
- **Advanced sales filtering** - Date ranges, pagination, sorting, and search
- **Customer transaction history** - Detailed purchase tracking per customer

### 👥 **Multi-User Business Operations**
- **Staff management** - Multiple sellers with different permission levels
- **Customer database** - Track customer information and purchase history
- **Product catalog** - Manage inventory, pricing, and descriptions
- **Audit trails** - Know who did what and when

### 🏢 **Enterprise-Ready Architecture**
- **Docker containerization** - Consistent deployment anywhere
- **MongoDB integration** - Scalable document database with direct admin access
- **Express.js foundation** - Battle-tested web framework
- **Dual management approach** - Both REST API and direct MongoDB Shell/Compass access
- **Comprehensive logging** - Monitor API usage and performance
- **Health check endpoints** - Monitor system status

## 📋 **API Overview**

**Base URL:** `http://localhost:3000/bitetrack`

| Feature | Endpoints | Key Actions |
|---------|-----------|-------------|
| **🔐 Auth** | `/auth/*` | Login, activate accounts, password reset |
| **🔎 Check Account** | `/auth/seller-status?email=x` | **PUBLIC:** Check if email exists (useful for client apps) |
| **👤 Sellers** | `/sellers/*` | Manage staff, roles, and permissions |
| **🏪 Customers** | `/customers/*` | Customer database and contact info |
| **📦 Products** | `/products/*` | Inventory, pricing, and catalog |
|| **💳 Sales** | `/sales/*` | Process orders, advanced filtering, payment tracking |

> 📚 **Full API documentation:** [`docs/API.md`](docs/API.md) | **Postman Collection:** [`docs/BiteTrack.postman_collection.json`](docs/BiteTrack.postman_collection.json)

## 📊 **Data Models & Business Logic**

<details>
<summary><strong>👤 User Management (Sellers)</strong></summary>

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
<summary><strong>💰 Sales & Transaction Logic</strong></summary>

**Atomic transaction processing:**
- Sales process multiple products in a single transaction
- Inventory automatically decrements when sale is created
- **All-or-nothing approach** - if any product is out of stock, entire sale fails
- Payment tracking with settled/unsettled status
- Complete audit trail with seller attribution

</details>

<details>
<summary><strong>📦 Inventory & Customer Management</strong></summary>

**Product catalog:**
- Name, description, current stock count, pricing
- Real-time inventory tracking with sales

**Customer database:**
- Contact information storage (no login access)
- Transaction history tracking
- Optional email field with uniqueness constraint

</details>

## 🔧 **Production Setup**

### Prerequisites
- **Docker** with Docker Compose support
- **Git** for cloning the repository

### Environment Configuration

The included `.env.docker` file has production-ready defaults:
```bash
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=supersecret  # Change this in production!
JWT_SECRET=supersecretjwt        # Change this in production!
NODE_ENV=production
```

**⚠️ For production**: Update passwords and secrets in `.env.docker`!

### Complete Stack Deployment

```bash
# 1. Clone and setup
git clone https://github.com/fcortesbio/BiteTrack
cd BiteTrack

# 2. Configure environment for production
cp .env.production.template .env.production
# Edit .env.production with your actual values:
# - Update MONGO_URI with production database
# - Change JWT_SECRET to a secure random string
# - Set FRONTEND_URLS to your frontend domain(s)

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

1. **Update your production environment:**
```bash
# In .env.production
FRONTEND_URLS=https://your-frontend-domain.com,https://admin.your-domain.com
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
curl localhost:27017  # Should return MongoDB HTTP message

# View real-time logs
docker compose logs -f bitetrack-api
docker compose logs -f mongodb
```

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

## 🧪 **Development & Integration**

### Project Structure
```
BiteTrack/
├── 🧠 models/              # Mongoose schemas
├── 🎮 controllers/       # Business logic
├── 🛜️ routes/            # API endpoints
├── 🔒 middleware/        # Auth, validation, error handling
├── 📚 docs/              # API documentation & Postman collection
├── 🧪 scripts/           # Testing and utility scripts
├── 🔑 create-superadmin.js # First-time setup script (IMPORTANT!)
├── 🐳 Dockerfile         # Container definition
├── 📦 docker-compose.yml # Complete stack orchestration
├── 🧪 test-data-persistence.sh # Comprehensive data persistence tests
├── ⚙️ .env.docker        # Docker environment configuration
└── 🔐 keyfile            # MongoDB replica set authentication
```

### Development Mode
```bash
# Local development with auto-reload
npm install
npm run dev  # Uses nodemon for hot reload
```

### Testing the API
```bash
# Health check
curl http://localhost:3000/bitetrack/health

# Import Postman collection for comprehensive testing
# File: docs/BiteTrack.postman_collection.json
```

### Data Persistence Testing
```bash
# Run comprehensive data persistence tests
./test-data-persistence.sh

# Run with verbose output
./test-data-persistence.sh --verbose

# Quick persistence check (for CI/automation)
./scripts/quick-persistence-test.sh

# Clean up test data only
./test-data-persistence.sh --clean
```

**What the persistence tests verify:**
- MongoDB container restart → Data survives ✅
- API container restart → Data survives ✅  
- Full stack restart → Data survives ✅
- Volume integrity → MongoDB volume preserved ✅

**Security Features:**
- 🔒 **No hardcoded credentials** - Tests read MongoDB credentials from environment variables
- 📁 **Automatic environment loading** - Loads from `.env.docker` file  
- 🛡️ **Credential override** - Can override with `MONGO_ROOT_USERNAME`/`MONGO_ROOT_PASSWORD`
- 🧹 **Automatic cleanup** - Test data is always cleaned up after tests

### Database Administration & External Management

BiteTrack's MongoDB setup provides **full administrative access** for system administrators and database professionals, enabling direct database management alongside the API.

#### **MongoDB Shell (mongosh) Access:**
```bash
# Connect directly to the database
mongosh mongodb://admin:supersecret@localhost:27017/bitetrack

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
mongodb://admin:supersecret@localhost:27017/bitetrack
```

**Compass provides:**
- 📊 **Visual data exploration** - Browse collections with rich GUI
- 📈 **Query performance insights** - Index usage and query optimization
- 🔍 **Advanced querying** - Visual query builder and aggregation pipeline editor
- 📋 **Schema analysis** - Automatic schema validation and field type analysis
- 📊 **Real-time monitoring** - Connection stats, query performance metrics

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
db.sales.deleteMany({ "totalAmount": { $lt: 1 } })  // Remove penny transactions

// 5. Index management
db.sales.createIndex({ "createdAt": -1, "sellerId": 1 })  // Optimize queries
db.sales.getIndexes()  // View all indexes
```

#### **Backup & Restore Operations:**
```bash
# Full database backup
docker compose exec mongodb mongodump \
  --uri="mongodb://admin:supersecret@localhost:27017/bitetrack" \
  --out /data/backups/$(date +%Y%m%d_%H%M%S)

# Restore from backup
docker compose exec mongodb mongorestore \
  --uri="mongodb://admin:supersecret@localhost:27017" \
  --drop /data/backups/BACKUP_FOLDER_NAME

# Export specific collection to JSON
docker compose exec mongodb mongoexport \
  --uri="mongodb://admin:supersecret@localhost:27017/bitetrack" \
  --collection=sales \
  --out=/data/exports/sales_export.json
```

#### **Enterprise Integration Benefits:**

✅ **Dual Management Approach** - Both API and direct database access  
✅ **Standard MongoDB Tools** - No vendor lock-in, use familiar tools  
✅ **Advanced Analytics** - Complex aggregations beyond API capabilities  
✅ **Audit & Compliance** - Direct access to all data for compliance reporting  
✅ **Performance Tuning** - Index optimization and query analysis  
✅ **Data Migration** - Easy import/export for system migrations  
✅ **Backup Integration** - Integrate with enterprise backup solutions  
✅ **Monitoring Integration** - Connect MongoDB monitoring tools (Ops Manager, etc.)  

> **💡 Pro Tip**: System administrators can use both the BiteTrack API for application-level operations and direct MongoDB access for database-level administration, providing complete flexibility for enterprise environments.

## 🚀 **Roadmap**

### Next Release (v2.0)
- [ ] **Reporting Dashboard** - Weekly sales, inventory alerts, top products
- [ ] **Advanced Analytics** - Customer behavior, sales trends
- [ ] **Webhook System** - Real-time notifications for low stock, large sales

### Future Vision
- [ ] **Frontend Client** - React/Vue dashboard for non-technical users  
- [ ] **Mobile App** - Native iOS/Android point-of-sale interface
- [ ] **AI Integration** - Smart inventory predictions and sales insights
- [ ] **Multi-location Support** - Franchise and chain restaurant features

## 🤝 **Contributing**

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

## 📜 **License**

**MIT License** - Free for commercial and personal use.

---

**🌟 Star this repo** if BiteTrack helps your food business grow! 

**Questions?** Reach out via [GitHub Issues](https://github.com/fcortesbio/BiteTrack/issues) or check the [documentation](docs/API.md).
