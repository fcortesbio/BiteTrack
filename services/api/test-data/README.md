# BiteTrack Test Data Documentation

This directory contains comprehensive test data for populating your BiteTrack database with realistic business data for development, testing, and demonstration purposes.

## 📁 File Structure

```
test-data/
├── README.md                    # This file - comprehensive guide
├── pending-sellers.json         # Pending seller accounts + activation data
├── customers.json               # Diverse customer profiles
├── products.json                # Food business product catalog
├── sales.json                   # Sales transaction templates
└── environment-data.json        # Test values and configurations
```

## 🚀 Quick Start - Database Seeding Workflow

### Prerequisites

1. BiteTrack API running on `http://localhost:3000/bitetrack`
2. Postman or similar API testing tool
3. Admin/Superadmin account created manually

### Step-by-Step Seeding Process

#### 1. **Login as Superadmin**

```json
POST /auth/login
{
  "email": "admin@bitetrack.com",
  "password": "SuperAdmin123!"
}
```

_Save the JWT token for subsequent requests_

#### 2. **Create Pending Sellers**

Use data from `pending-sellers.json`:

```json
POST /sellers/pending
{
  "firstName": "Maria",
  "lastName": "Rodriguez",
  "email": "maria.rodriguez@foodhub.com",
  "dateOfBirth": "1992-03-15"
}
```

_Repeat for all pending sellers in the file_

#### 3. **Activate Some Sellers**

Use activation data from `pending-sellers.json`:

```json
POST /auth/activate
{
  "email": "maria.rodriguez@foodhub.com",
  "lastName": "Rodriguez",
  "dateOfBirth": "1992-03-15",
  "password": "SecurePass123!"
}
```

#### 4. **Create Customers**

Use data from `customers.json`:

```json
POST /customers
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "phoneNumber": "+1-555-0101",
  "email": "alice.johnson@email.com"
}
```

_Create 10-20 customers for variety_

#### 5. **Create Products**

Use data from `products.json` by category:

```json
POST /products
{
  "productName": "Turkey Club Sandwich",
  "description": "Freshly sliced turkey breast, crispy bacon, lettuce, tomato, and mayo on toasted sourdough bread",
  "count": 25,
  "price": 12.99
}
```

_Create products from all categories: sandwiches, beverages, sides, desserts_

#### 6. **Create Sales Transactions**

Use templates from `sales.json` (replace IDs with actual created IDs):

```json
POST /sales
{
  "customerId": "actual-customer-id",
  "products": [
    {
      "productId": "actual-product-id",
      "quantity": 1
    }
  ],
  "amountPaid": 12.99
}
```

## 📊 Data Categories Overview

### 👥 Sellers

- **8 Pending sellers** ready for activation testing
- **4 Activation templates** with valid credentials
- Various demographic backgrounds and roles

### 👤 Customers

- **20+ Diverse customers** with different contact preferences
- **5 Bulk test customers** for automation
- Mix of customers with/without email addresses
- Various phone number formats

### 🍕 Products

- **30+ Food items** across categories:
  - 🥪 **Sandwiches** (10 items) - $8.99-$14.99
  - ☕ **Beverages** (8 items) - $1.99-$6.49
  - 🥗 **Sides** (8 items) - $1.49-$5.49
  - 🍰 **Desserts** (4 items) - $2.99-$6.49
  - 🎃 **Seasonal** (4 items) - $3.99-$13.99
- **Edge case items**: Out of stock, expensive, low stock
- **Test items** for automation

### 💰 Sales

- **Realistic scenarios**: Single items, combos, family orders, catering
- **Payment scenarios**: Exact payment, overpayment, partial payment
- **Edge cases**: Low-cost items, bulk orders, mixed pricing
- **Settlement examples**: Payment updates and adjustments

## 🛠 Environment Configuration

Use values from `environment-data.json`:

### Test Credentials

- **Superadmin**: `admin@bitetrack.com` / `SuperAdmin123!`
- **Admin**: `manager@bitetrack.com` / `AdminPass456@`
- **User**: `employee@bitetrack.com` / `UserPass789#`

### Common Test Values

- **Valid passwords**: Complex passwords meeting requirements
- **Invalid passwords**: Various failure scenarios
- **Phone formats**: Different valid phone number formats
- **Price ranges**: Low ($0.99-$4.99) to Premium ($50+)

## 🔧 Postman Collection Integration

### Using with Existing Collection

1. Import your `bitetrack-complete-collection.json`
2. Replace example data with values from test data files
3. Use environment variables from `environment-data.json`

### Automation Scripts

Add these Postman test scripts for automation:

```javascript
// Save created IDs for chaining requests
const responseData = pm.response.json();
if (responseData && responseData.id) {
  pm.collectionVariables.set("lastCreatedId", responseData.id);
}

// Verify successful creation
pm.test("Item created successfully", function () {
  pm.response.to.have.status(201);
});
```

## 📈 Testing Scenarios

### Authentication Testing

- ✅ Seller status checks (active/pending/not found)
- ✅ Login with different role levels
- ✅ Account activation workflow
- ✅ Password recovery process

### CRUD Operations Testing

- ✅ **Create**: All entity types with valid data
- ✅ **Read**: List operations with filtering
- ✅ **Update**: Profile changes, inventory updates
- ✅ **Delete**: Account deactivation, item removal

### Business Logic Testing

- ✅ **Inventory management**: Stock updates during sales
- ✅ **Payment processing**: Exact, partial, overpayment scenarios
- ✅ **Role-based access**: Permission enforcement
- ✅ **Data relationships**: Customer-sales connections

### Edge Case Testing

- ✅ **Out of stock scenarios**
- ✅ **Large quantity orders**
- ✅ **Invalid data inputs**
- ✅ **Permission boundary testing**

## 🎯 Recommended Seeding Order

1. **Setup Base Accounts** (1-2 minutes)
   - Login as superadmin
   - Create 2-3 admin accounts

2. **Create Core Data** (5-10 minutes)
   - 5-10 pending sellers
   - 15-20 customers
   - 20-30 products across categories

3. **Generate Transactions** (5-10 minutes)
   - 10-15 sales with various scenarios
   - Include settled and partial payments

4. **Test Workflows** (10-15 minutes)
   - Account activation process
   - Role management
   - Sales processing

**Total Setup Time: ~20-30 minutes**

## 🚨 Important Notes

### ID Replacement Required

- Sales data uses placeholder IDs (`CUSTOMER_ID_1`, `PRODUCT_ID_1`)
- Replace with actual IDs after creating customers/products
- Use Postman variables for dynamic ID handling

### Authentication Tokens

- JWT tokens expire - refresh as needed
- Use collection-level auth for convenience
- Store tokens in environment variables

### Data Dependencies

- **Sellers must exist** before creating sales
- **Customers must exist** before creating sales
- **Products must exist** before creating sales
- **Pending sellers must exist** before activation

## 🔍 Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT token validity
2. **403 Forbidden**: Verify role permissions
3. **404 Not Found**: Ensure referenced IDs exist
4. **400 Validation Error**: Check required fields and formats

### Data Validation

- Email formats must be valid
- Phone numbers accept various formats
- Passwords must meet complexity requirements
- Dates must be in YYYY-MM-DD format

## 📝 Next Steps

1. **Import the data** following the seeding workflow
2. **Customize as needed** for your specific test scenarios
3. **Add more data** using the existing patterns
4. **Create automated scripts** for regular database resets
5. **Share with your team** for consistent testing environments

---

**Happy Testing!** 🎉

This test data gives you a complete food business simulation with realistic customers, products, and sales scenarios. Perfect for development, testing, and demonstrations!
