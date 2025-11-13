# ES Modules (ESM) Migration Roadmap

> **Migration Type**: CommonJS → ES Modules
> **Approach**: Red-Green-Refactor (TDD)
> **Total Files**: 51 JavaScript files
> **Estimated Time**: 2-3 hours
> **Branch**: `feature/esm-migration`

---

## Migration Goals

### Primary Objectives
1. Convert all CommonJS modules to ES Modules
2. Maintain 100% test pass rate (204/204 tests)
3. Zero breaking changes to API functionality
4. Docker builds successfully
5. All linting passes

### Secondary Benefits
- Modern JavaScript standard (future-proof)
- Better tree-shaking and bundle optimization
- Improved IDE support and autocomplete
- Native browser ESM compatibility (future UI)
- Cleaner, more maintainable code

---

## Migration Scope Analysis

### File Inventory (51 files)

```
BiteTrack/
  Configuration (2 files)
    index.js
    config/swagger.js
  Tests (19 files)
    tests/setup.js
    tests/helpers/ (3 files)
    tests/integration/ (5 files)
    tests/unit/ (10 files)
  Models (8 files)
    models/*.js
  Controllers (8 files)
    controllers/*.js
  Routes (8 files)
    routes/*.js
  Middleware (3 files)
    middleware/*.js
  Utils (2 files)
    utils/*.js
  Scripts (1+ files)
     create-superadmin.js
```

---

## Migration Strategy: Red-Green-Refactor (TDD)

### Phase 0: Pre-Migration Setup
**Goal**: Prepare environment and create safety net
**Duration**: 10-15 minutes

#### Checklist:
- [ ] Create feature branch: `git checkout -b feature/esm-migration`
- [ ] Run full test suite: `npm test` (baseline - all passing)
- [ ] Verify Docker build: `docker compose build`
- [ ] Create backup commit point
- [ ] Document current state (test results, linting status)

---

## RED Phase: Test Infrastructure Migration

### Phase 1: Jest Configuration & Test Setup
**Goal**: Make tests ESM-compatible (they will fail - RED state)
**Duration**: 15-20 minutes

#### 1.1 Update package.json (5 min)
```json
{
  "type": "module", // Change from "commonjs"
  "jest": {
    "testEnvironment": "node",
    "transform": {}, // Disable Babel transform
    "extensionsToTreatAsEsm": [".js"],
    "moduleNameMapper": {
      "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    "setupFilesAfterEnv": [
      "<rootDir>/tests/setup.js"
    ],
    "testMatch": [
      "<rootDir>/tests/**/*.test.js"
    ],
    "collectCoverageFrom": [
      "controllers/**/*.js",
      "models/**/*.js",
      "middleware/**/*.js",
      "routes/**/*.js",
      "utils/**/*.js",
      "!**/node_modules/**",
      "!**/coverage/**"
    ],
    "coverageReporters": ["text", "lcov", "html"],
    "testTimeout": 30000
  }
}
```

#### 1.2 Update npm scripts (5 min)
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "NODE_ENV=development nodemon --experimental-modules index.js",
    "test": "cross-env NODE_OPTIONS='--experimental-vm-modules --no-warnings' NODE_ENV=test jest",
    "test:watch": "cross-env NODE_OPTIONS='--experimental-vm-modules --no-warnings' NODE_ENV=test jest --watch",
    "test:coverage": "cross-env NODE_OPTIONS='--experimental-vm-modules --no-warnings' NODE_ENV=test jest --coverage",
    "test:verbose": "cross-env NODE_OPTIONS='--experimental-vm-modules --no-warnings' NODE_ENV=test jest --verbose"
  }
}
```

#### 1.3 Migrate tests/setup.js (5 min)
**File**: `tests/setup.js`

**Before (CommonJS)**:
```javascript
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  // setup code
});

module.exports = { mongoServer };
```

**After (ESM)**:
```javascript
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

beforeAll(async () => {
  // setup code
});

export { mongoServer };
```

#### 1.4 Migrate test helpers (10 min)
**Files**:
- `tests/helpers/auth.helper.js`
- `tests/helpers/data.helper.js`
- `tests/helpers/request.helper.js`

**Key Changes**:
```javascript
// Before
const request = require('supertest');
const jwt = require('jsonwebtoken');
module.exports = { generateToken, createTestUser };

// After
import request from 'supertest';
import jwt from 'jsonwebtoken';
export { generateToken, createTestUser };
```

**Expected State**: Tests fail (RED) - dependencies not yet migrated

---

## GREEN Phase: Core Dependencies Migration

### Phase 2: Foundation Layer (Utils & Helpers)
**Goal**: Migrate lowest-level dependencies first
**Duration**: 10-15 minutes

#### 2.1 Migrate utils/ (10 min)
**Files**:
- `utils/jwt.js` - JWT token generation/validation
- `utils/validation.js` - Express-validator rules

**Key ESM Patterns**:
```javascript
// Before
const jwt = require('jsonwebtoken');
module.exports = { generateToken, verifyToken };

// After
import jwt from 'jsonwebtoken';
export const generateToken = (payload) => { /* ... */ };
export const verifyToken = (token) => { /* ... */ };
```

**Critical ESM Changes**:
- Add `.js` extensions to local imports: `'./jwt'` → `'./jwt.js'`
- Named exports for multiple functions
- Default export for single main export

---

### Phase 3: Data Layer (Models)
**Goal**: Migrate Mongoose schemas
**Duration**: 15-20 minutes

#### 3.1 Migrate models/ (15 min)
**Files** (8 models):
- `models/Seller.js`
- `models/PendingSeller.js`
- `models/Customer.js`
- `models/Product.js`
- `models/Sale.js`
- `models/InventoryDrop.js`
- `models/PasswordResetToken.js`

**Mongoose ESM Pattern**:
```javascript
// Before
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sellerSchema = new mongoose.Schema({ /* ... */ });

module.exports = mongoose.model('Seller', sellerSchema);

// After
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sellerSchema = new mongoose.Schema({ /* ... */ });

export default mongoose.model('Seller', sellerSchema);
```

**Test Checkpoint**: Run model unit tests
```bash
npm test -- tests/unit/models/
```
**Expected**: Model tests passing

---

### Phase 4: Business Logic Layer (Middleware)
**Goal**: Migrate authentication and middleware
**Duration**: 10-15 minutes

#### 4.1 Migrate middleware/ (10 min)
**Files**:
- `middleware/auth.js` - JWT authentication & authorization
- `middleware/errorHandler.js` - Global error handling
- `middleware/upload.js` - File upload configuration (if exists)

**Middleware ESM Pattern**:
```javascript
// Before
const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller');

const authenticate = async (req, res, next) => { /* ... */ };
const authorize = (...roles) => { /* ... */ };

module.exports = { authenticate, authorize };

// After
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';

export const authenticate = async (req, res, next) => { /* ... */ };
export const authorize = (...roles) => { /* ... */ };
```

**Test Checkpoint**: Run middleware unit tests
```bash
npm test -- tests/unit/middleware/
```
**Expected**: Middleware tests passing

---

### Phase 5: Controllers
**Goal**: Migrate business logic controllers
**Duration**: 20-25 minutes

#### 5.1 Migrate controllers/ (20 min)
**Files** (8 controllers):
- `controllers/authController.js`
- `controllers/sellerController.js`
- `controllers/customerController.js`
- `controllers/productController.js`
- `controllers/saleController.js`
- `controllers/reportingController.js`
- `controllers/inventoryDropController.js`
- `controllers/testDataController.js`

**Controller ESM Pattern**:
```javascript
// Before
const Seller = require('../models/Seller');
const { generateToken } = require('../utils/jwt');

const login = async (req, res, next) => { /* ... */ };
const activate = async (req, res, next) => { /* ... */ };

module.exports = { login, activate, recover, reset };

// After
import Seller from '../models/Seller.js';
import { generateToken } from '../utils/jwt.js';

export const login = async (req, res, next) => { /* ... */ };
export const activate = async (req, res, next) => { /* ... */ };
```

**Test Checkpoint**: Run controller unit tests
```bash
npm test -- tests/unit/controllers/
```
**Expected**: Controller tests passing

---

### Phase 6: Routes
**Goal**: Migrate Express route definitions
**Duration**: 15-20 minutes

#### 6.1 Migrate routes/ (15 min)
**Files** (8 route files):
- `routes/auth.js`
- `routes/sellers.js`
- `routes/customers.js`
- `routes/products.js`
- `routes/sales.js`
- `routes/reporting.js`
- `routes/inventoryDrops.js`
- `routes/testDataRoutes.js`

**Route ESM Pattern**:
```javascript
// Before
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { login, activate } = require('../controllers/authController');

router.post('/login', login);
router.post('/activate', activate);

module.exports = router;

// After
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { login, activate } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/activate', activate);

export default router;
```

**Test Checkpoint**: Run integration tests (partial)
```bash
npm test -- tests/integration/auth-real.test.js
```
**Expected**: Auth integration tests passing

---

### Phase 7: Configuration & Main Entry
**Goal**: Migrate Swagger config and main index.js
**Duration**: 10-15 minutes

#### 7.1 Migrate config/swagger.js (5 min)
```javascript
// Before
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const loadOpenAPISpec = () => { /* ... */ };

module.exports = { swaggerSpec, swaggerOptions };

// After
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadOpenAPISpec = () => { /* ... */ };

export { swaggerSpec, swaggerOptions };
```

#### 7.2 Migrate index.js (10 min)
```javascript
// Before
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
app.use('/bitetrack/auth', authRoutes);

module.exports = app;

// After
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';

const app = express();
app.use('/bitetrack/auth', authRoutes);

export default app;
```

**Critical ESM Changes**:
- Replace `__dirname` with ESM equivalent:
  ```javascript
  import { fileURLToPath } from 'url';
  import { dirname } from 'path';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  ```

**Test Checkpoint**: Run ALL tests
```bash
npm test
```
**Expected**: All 204 tests passing (GREEN state achieved!)

---

### Phase 8: Scripts & Utilities
**Goal**: Migrate standalone scripts
**Duration**: 5-10 minutes

#### 8.1 Migrate create-superadmin.js (5 min)
```javascript
// Before
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// After
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

---

## REFACTOR Phase: Optimization & Cleanup

### Phase 9: Integration Tests Migration
**Goal**: Migrate all integration tests
**Duration**: 20-25 minutes

#### 9.1 Migrate integration tests (20 min)
**Files**:
- `tests/integration/auth-real.test.js`
- `tests/integration/customers.test.js`
- `tests/integration/inventory-drops.test.js`
- `tests/integration/products.test.js`
- `tests/integration/sales.test.js`

**Integration Test ESM Pattern**:
```javascript
// Before
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');
const Seller = require('../../models/Seller');

describe('Auth API', () => {
  beforeEach(async () => { /* ... */ });

  test('should login successfully', async () => { /* ... */ });
});

// After
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../index.js';
import Seller from '../../models/Seller.js';

describe('Auth API', () => {
  beforeEach(async () => { /* ... */ });

  test('should login successfully', async () => { /* ... */ });
});
```

**Test Checkpoint**: Run ALL integration tests
```bash
npm test -- tests/integration/
```
**Expected**: All integration tests passing

---

### Phase 10: Unit Tests Migration
**Goal**: Migrate all unit tests
**Duration**: 15-20 minutes

#### 10.1 Migrate unit tests (15 min)
**Files**:
- `tests/unit/controllers/authController.test.js`
- `tests/unit/middleware/auth.test.js`
- `tests/unit/models/*.test.js`
- `tests/unit/utils/*.test.js`

**Unit Test ESM Pattern**:
```javascript
// Before
const { generateToken, verifyToken } = require('../../../utils/jwt');
const jwt = require('jsonwebtoken');

describe('JWT Utils', () => {
  test('should generate valid token', () => { /* ... */ });
});

// After
import { generateToken, verifyToken } from '../../../utils/jwt.js';
import jwt from 'jsonwebtoken';

describe('JWT Utils', () => {
  test('should generate valid token', () => { /* ... */ });
});
```

**Test Checkpoint**: Run ALL tests (final validation)
```bash
npm test
npm run test:coverage
```
**Expected**: All 204 tests passing with coverage report

---

## Phase 11: Final Validation & Cleanup

### 11.1 Docker & Deployment Validation (10 min)
```bash
# Build Docker image with ESM
docker compose build

# Run container and test
docker compose up -d
curl http://localhost:3000/bitetrack/health

# Stop containers
docker compose down
```

### 11.2 Linting & Code Quality (5 min)
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Verify no warnings
npm run lint:check
```

### 11.3 Documentation Updates (5 min)
**Files to update**:
- [ ] Update README.md (add ESM note if needed)
- [ ] Update CONTRIBUTING.md (if exists)
- [ ] Add migration notes to CHANGELOG

---

## Success Criteria Checklist

### Must-Have (Blocking)
- [ ] All 204 tests passing (`npm test`)
- [ ] Test coverage maintained or improved
- [ ] Docker builds successfully
- [ ] API functionality unchanged (health endpoint works)
- [ ] No ESLint errors (`npm run lint:check`)

### Should-Have (Important)
- [ ] All npm scripts work correctly
- [ ] Development server runs (`npm run dev`)
- [ ] Production server runs (`npm start`)
- [ ] create-superadmin.js script works

### Nice-to-Have (Optional)
- [ ] Performance benchmark (API response times similar)
- [ ] Bundle size analysis (if applicable)
- [ ] Update CI/CD pipeline for ESM

---

## Common ESM Migration Pitfalls

### 1. Missing .js Extensions
 **Wrong**: `import User from './models/User'`
 **Correct**: `import User from './models/User.js'`

### 2. __dirname Not Available
 **Wrong**: `path.join(__dirname, 'file.txt')`
 **Correct**:
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 3. Dynamic require() Statements
 **Wrong**: `require(dynamicPath)`
 **Correct**: Use dynamic `import()` (returns Promise)
```javascript
const module = await import(dynamicPath);
```

### 4. JSON Imports
 **Wrong**: `const config = require('./config.json')`
 **Correct**:
```javascript
import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));
// OR use import assertion (Node 17.5+)
import config from './config.json' assert { type: 'json' };
```

### 5. Circular Dependencies
- ESM is stricter about circular dependencies
- Refactor code if circular import errors occur
- Use dependency injection or move shared code to separate module

---

## Migration Checklist Summary

### Pre-Migration
- [ ] Create branch: `feature/esm-migration`
- [ ] Run baseline tests: `npm test`
- [ ] Verify Docker: `docker compose build`

### Test Infrastructure (RED Phase)
- [ ] Update package.json type to "module"
- [ ] Configure Jest for ESM
- [ ] Migrate tests/setup.js
- [ ] Migrate test helpers (3 files)

### Core Dependencies (GREEN Phase)
- [ ] Migrate utils/ (2 files)
- [ ] Migrate models/ (8 files)
- [ ] Migrate middleware/ (3 files)
- [ ] Migrate controllers/ (8 files)
- [ ] Migrate routes/ (8 files)
- [ ] Migrate config/ (1 file)
- [ ] Migrate index.js
- [ ] Migrate scripts (create-superadmin.js)

### Test Migration (REFACTOR Phase)
- [ ] Migrate integration tests (5 files)
- [ ] Migrate unit tests (10 files)

### Final Validation
- [ ] All tests passing (204/204)
- [ ] Docker builds successfully
- [ ] Linting passes
- [ ] Documentation updated

---

## Post-Migration Benefits

### Immediate Improvements
- Modern JavaScript standard compliance
- Better IDE autocomplete and IntelliSense
- Cleaner import syntax
- Elimination of circular dependency issues

### Future Capabilities Unlocked
- Top-level await support
- Native browser compatibility (for future UI)
- Better tree-shaking (smaller bundles)
- TypeScript migration path (if needed)
- Modern build tools compatibility

---

## Rollback Plan

If migration fails:
```bash
# Discard all changes and return to main
git checkout main
git branch -D feature/esm-migration

# Or keep branch and reset to pre-migration commit
git checkout feature/esm-migration
git reset --hard <commit-hash-before-migration>
```

---

## ESM Resources

### Official Documentation
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [MDN Import/Export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### Community Guides
- [Pure ESM Package Guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
- [ESM in Node.js](https://blog.logrocket.com/es-modules-in-node-today/)

---

## Next Steps After ESM Migration

1. **MCP Server Integration** - ESM makes external tool integration easier
2. **Frontend Development** - ESM shares modules between backend/frontend
3. **TypeScript Migration** - ESM simplifies TypeScript adoption
4. **Monorepo Setup** - ESM works better with monorepo tools

---

**Migration Status**: Not Started
**Last Updated**: January 5, 2025
**Maintainer**: @fcortesbio
