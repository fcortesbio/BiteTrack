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

# 2. Start complete stack (MongoDB + BiteTrack API)
docker compose --env-file .env.docker up -d

# 3. Verify everything is running
docker compose ps
curl http://localhost:3000/bitetrack/health

# 🎉 API ready at http://localhost:3000
# 🍃 MongoDB available at localhost:27017
```

## 🛠️ **Development Workflow**

### **Container Deployment (Recommended)**
```bash
# Start full stack
docker compose --env-file .env.docker up -d

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
docker compose --env-file .env.docker up mongodb -d

# Run BiteTrack locally for development
npm install
npm run dev  # Uses nodemon, connects to containerized MongoDB

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

### 🏗️ **Enterprise-Ready Architecture**
- **Docker containerization** - Consistent deployment anywhere
- **MongoDB integration** - Scalable document database
- **Express.js foundation** - Battle-tested web framework
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

# 2. Update production secrets (IMPORTANT!)
# Edit .env.docker with secure passwords

# 3. Deploy complete stack
docker compose --env-file .env.docker up -d

# 4. Verify deployment
docker compose ps
curl http://localhost:3000/bitetrack/health

# 5. Monitor logs
docker compose logs -f
```

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
