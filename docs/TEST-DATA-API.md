# 🧪 **Test Data Management API**

> **⚠️ DEVELOPMENT/TESTING ONLY**: These endpoints are automatically disabled in production environments for security.

The Test Data Management API provides powerful endpoints for populating, managing, and resetting test data in development and testing environments. All endpoints require authentication and admin privileges.

## 🔒 **Security & Access Control**

- **Environment Restriction**: Automatically disabled when `NODE_ENV=production`
- **Authentication**: All endpoints require valid JWT token
- **Role-based Access**: 
  - **Admin/SuperAdmin**: Can populate, clean, and check status
  - **SuperAdmin only**: Can perform database resets (most destructive)
- **Confirmation Required**: Destructive operations require explicit confirmation flags

---

## 📊 **Get Test Data Status**

**Endpoint:** `GET /bitetrack/test-data/status`  
**Access:** Admin/SuperAdmin  
**Description:** Get comprehensive statistics about current test data in the database.

### Request Headers:
```
Authorization: Bearer <jwt_token>
```

### Response (200 OK):
```json
{
  "environment": "development",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "counts": {
    "customers": 15,
    "products": 28,
    "sales": 12,
    "pendingSellers": 3
  },
  "salesStatistics": {
    "totalSalesValue": 342.89,
    "averageOrderValue": 28.57,
    "settledSales": 8,
    "unsettledSales": 4
  },
  "recentSales": [
    {
      "id": "507f1f77bcf86cd799439040",
      "customer": "Alice Johnson",
      "seller": "John Doe",
      "totalAmount": 24.99,
      "settled": true,
      "createdAt": "2024-01-15T10:25:00.000Z"
    }
  ],
  "statusCode": 200
}
```

**Use Cases:**
- Check current database state before populating
- Monitor test environment health
- Get sample IDs for manual testing
- Verify data population success

---

## 🚀 **Populate Test Data**

**Endpoint:** `POST /bitetrack/test-data/populate`  
**Access:** Admin/SuperAdmin  
**Description:** Populate the database with realistic test data from JSON templates.

### Request Headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body:
```json
{
  "preset": "dev",
  "cleanBefore": true,
  "verbose": false
}
```

### Parameters:
- **`preset`** (optional): Data set size
  - `"minimal"` - 5 customers, 7 products, 3 sales (default)
  - `"dev"` - 10 customers, 14 products, 7 sales
  - `"full"` - Complete realistic dataset (~20 customers, ~35 products)
  - `"bulk"` - Large dataset for performance testing
- **`cleanBefore`** (optional): Clean existing data before populating (default: false)
- **`verbose`** (optional): Enable detailed logging (default: false)

### Response (201 Created):
```json
{
  "message": "Test data populated successfully",
  "summary": {
    "preset": "dev",
    "timestamp": "2024-01-15T10:35:00.000Z",
    "requestedBy": "507f1f77bcf86cd799439011",
    "requestedByUser": "Admin User",
    "counts": {
      "customers": 10,
      "products": 14,
      "sales": 7,
      "pendingSellers": 4
    },
    "sampleIds": {
      "firstCustomer": "507f1f77bcf86cd799439020",
      "firstProduct": "507f1f77bcf86cd799439030",
      "firstSale": "507f1f77bcf86cd799439040"
    },
    "statistics": {
      "totalSalesValue": 158.93,
      "averageOrderValue": 22.70,
      "settledSales": 4,
      "unsettledSales": 3
    }
  },
  "statusCode": 201
}
```

**Example Usage:**
```bash
# Populate development dataset with cleanup
curl -X POST http://localhost:3000/bitetrack/test-data/populate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preset": "dev",
    "cleanBefore": true,
    "verbose": true
  }'
```

---

## 🗑️ **Clean Test Data**

**Endpoint:** `DELETE /bitetrack/test-data/clean`  
**Access:** Admin/SuperAdmin  
**Description:** Selectively remove test data from the database with preservation options.

### Request Headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body:
```json
{
  "confirmClean": true,
  "preserveData": ["products"]
}
```

### Parameters:
- **`confirmClean`** (required): Must be `true` to proceed (safety measure)
- **`preserveData`** (optional): Array of data types to preserve
  - Available options: `["customers", "products", "sales", "pendingSellers"]`
  - Seller accounts are always preserved

### Response (200 OK):
```json
{
  "message": "Successfully cleaned test data. Deleted 25 records.",
  "summary": {
    "timestamp": "2024-01-15T10:40:00.000Z",
    "requestedBy": "507f1f77bcf86cd799439011",
    "requestedByUser": "Admin User",
    "deletedCounts": {
      "sales": 7,
      "customers": 10,
      "products": 0,
      "pendingSellers": 8
    },
    "preserved": ["products"]
  },
  "statusCode": 200
}
```

**Example Usage:**
```bash
# Clean all data except products
curl -X DELETE http://localhost:3000/bitetrack/test-data/clean \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmClean": true,
    "preserveData": ["products"]
  }'
```

---

## 🔄 **Reset to Test Scenario**

**Endpoint:** `POST /bitetrack/test-data/reset`  
**Access:** SuperAdmin only  
**Description:** Reset the entire database to a specific test scenario (most destructive operation).

### Request Headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body:
```json
{
  "scenario": "dev",
  "confirmReset": true
}
```

### Parameters:
- **`scenario`** (optional): Target scenario
  - `"clean"` - Remove all test data, keep only sellers (default)
  - `"minimal"` - Reset to minimal test dataset
  - `"dev"` - Reset to development dataset
  - `"full"` - Reset to complete test dataset
- **`confirmReset`** (required): Must be `true` to proceed (safety measure)

### Response (200 OK):
```json
{
  "message": "Database reset completed successfully",
  "summary": {
    "scenario": "dev",
    "message": "Database reset to dev test scenario",
    "timestamp": "2024-01-15T10:45:00.000Z",
    "requestedBy": "507f1f77bcf86cd799439011",
    "requestedByUser": "Super Admin",
    "counts": {
      "customers": 10,
      "products": 14,
      "sales": 7,
      "pendingSellers": 4
    }
  },
  "statusCode": 200
}
```

**Example Usage:**
```bash
# Reset to clean state (no test data)
curl -X POST http://localhost:3000/bitetrack/test-data/reset \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "clean",
    "confirmReset": true
  }'
```

---

## 🛠️ **Integration Examples**

### Frontend Dashboard Integration
```javascript
// React example - Reset environment button
const resetEnvironment = async (scenario = 'dev') => {
  try {
    const response = await fetch('/bitetrack/test-data/reset', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scenario,
        confirmReset: true
      })
    });
    
    const result = await response.json();
    console.log(`Environment reset: ${result.summary.counts.customers} customers, ${result.summary.counts.products} products created`);
  } catch (error) {
    console.error('Reset failed:', error);
  }
};
```

### Automated Testing Integration
```javascript
// Jest/Testing example - Setup test environment
beforeEach(async () => {
  // Reset to minimal dataset before each test
  await request(app)
    .post('/bitetrack/test-data/reset')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      scenario: 'minimal',
      confirmReset: true
    })
    .expect(200);
});

afterAll(async () => {
  // Clean up after all tests
  await request(app)
    .delete('/bitetrack/test-data/clean')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ confirmClean: true })
    .expect(200);
});
```

### CI/CD Pipeline Integration
```bash
#!/bin/bash
# CI pipeline script example

echo "🧪 Setting up test environment..."

# Get auth token
TOKEN=$(curl -X POST http://localhost:3000/bitetrack/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bitetrack.com","password":"SuperAdmin123!"}' | \
  jq -r '.token')

# Populate test data
curl -X POST http://localhost:3000/bitetrack/test-data/populate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preset":"minimal","cleanBefore":true}' \
  --fail

echo "✅ Test environment ready"

# Run your tests here...

# Cleanup
curl -X DELETE http://localhost:3000/bitetrack/test-data/clean \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmClean":true}' \
  --fail

echo "🧹 Test environment cleaned"
```

---

## ⚠️ **Error Responses**

### Production Environment (403 Forbidden):
```json
{
  "error": "Forbidden",
  "message": "Test data endpoints are disabled in production",
  "statusCode": 403
}
```

### Missing Confirmation (400 Bad Request):
```json
{
  "error": "Confirmation Required",
  "message": "Must set confirmClean: true to proceed with data deletion",
  "hint": "This is a safety measure to prevent accidental data loss",
  "statusCode": 400
}
```

### Insufficient Permissions (403 Forbidden):
```json
{
  "error": "Forbidden",
  "message": "Only superadmins can perform database resets",
  "statusCode": 403
}
```

### Invalid Preset (400 Bad Request):
```json
{
  "error": "Validation Error",
  "message": "Invalid preset. Must be one of: minimal, dev, full, bulk",
  "statusCode": 400
}
```

---

## 🎯 **Best Practices**

### Development Workflow:
1. **Check Status First**: Always check current state with `GET /status`
2. **Use Appropriate Preset**: Choose the right data size for your needs
3. **Clean Before Major Changes**: Use `cleanBefore: true` when switching scenarios
4. **Preserve Selectively**: Use `preserveData` to keep specific data types during cleanup

### Testing Workflow:
1. **Reset Before Tests**: Use `POST /reset` to ensure clean starting state
2. **Use Minimal Dataset**: Choose `"minimal"` preset for faster test execution
3. **Clean After Tests**: Always clean up test data after test suites

### Safety Guidelines:
1. **Double-check Environment**: These endpoints are disabled in production automatically
2. **Require Confirmation**: All destructive operations require explicit confirmation
3. **Limit SuperAdmin Access**: Only give SuperAdmin role to trusted users for reset operations
4. **Monitor Usage**: Log all test data operations for audit trails

---

## 🚀 **Benefits of API-Based Test Data Management**

✅ **Remote Management** - Trigger from CI/CD, frontend dashboards, or external tools  
✅ **Consistent Authentication** - Uses same JWT security model as rest of API  
✅ **Granular Control** - Choose exactly what data to populate or preserve  
✅ **Audit Trail** - All operations logged with user attribution  
✅ **Safety Features** - Multiple confirmation requirements and environment checks  
✅ **Integration Ready** - Perfect for automated testing and development workflows  

These endpoints transform test data management from manual script execution to a professional, integrated part of your development workflow! 🎉