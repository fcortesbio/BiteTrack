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

## 🚀 **Quick Start**

```bash
# 1. Ensure MongoDB is running (port 27017)
mongosh localhost:27017 --eval 'db.adminCommand({ping: 1})'

# 2. Clone and setup
git clone https://github.com/fcortesbio/BiteTrack
cd BiteTrack

# 3. Configure environment
cat > .env << EOF
MONGO_URI=mongodb://admin:supersecret@mongo:27017/bitetrack
JWT_SECRET=supersecretjwt
PORT=3000
EOF

# 4. Build and run
DOCKER_BUILDKIT=1 docker build . -t bitetrack:latest
docker run -d -p 3000:3000 --env-file .env --name BiteTrack bitetrack:latest

# 🎉 API ready at http://localhost:3000
```

## 🔑 **First-Time Setup** (CRITICAL)

**⚠️ All API routes require authentication - you need a SuperAdmin account first!**

### Step 1: Create Your First SuperAdmin
```bash
# Run the interactive setup script
node create-superadmin.js

# Follow prompts to enter:
# - First name, Last name, Email
# - Date of birth (YYYY-MM-DD format) 
# - Secure password (8+ chars, mixed case, numbers, symbols)
```

### Step 2: Insert SuperAdmin into Database
```bash
# Copy the generated MongoDB command and run it in mongosh
mongosh mongodb://admin:supersecret@localhost:27017/bitetrack
# Paste and execute the generated db.sellers.insertOne() command
```

### Step 3: Get Your JWT Token
```bash
# Login to get your authentication token
curl -X POST http://localhost:3000/bitetrack/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"YourPassword123!"}'

# Save the returned token - you'll need it for all API calls!
```

### Step 4: Verify Setup
```bash
# Test authenticated endpoint (replace YOUR_JWT_TOKEN)
curl -X GET http://localhost:3000/bitetrack/sellers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

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
| **💳 Sales** | `/sales/*` | Process orders, track payments |

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
- **Docker** with BuildKit support
- **MongoDB 6.0+** running on port 27017 ([mongo-docker example](https://github.com/fcortesbio/mongo-docker/blob/main/docker-compose.yml))

### Environment Configuration

```bash
# Create production-ready .env file
cat > .env << EOF
MONGO_URI=mongodb://admin:your-secure-password@mongo:27017/bitetrack
JWT_SECRET=your-super-secure-jwt-secret-here
PORT=3000
NODE_ENV=production
EOF
```

### Health Check
```bash
# Verify MongoDB connection
mongosh localhost:27017 --eval 'db.adminCommand({ping: 1})'
# Expected: { ok: 1 }
```

### Deployment
```bash
# Production build and run
DOCKER_BUILDKIT=1 docker build . -t bitetrack:production
docker run -d -p 3000:3000 --env-file .env \
  --name bitetrack-api --restart unless-stopped \
  bitetrack:production

# Verify health
curl http://localhost:3000/bitetrack/health
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
├── 🔑 create-superadmin.js # First-time setup script (IMPORTANT!)
└── 🐳 Dockerfile         # Container definition
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
