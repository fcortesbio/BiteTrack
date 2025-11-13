# BiteTrack API Documentation

## Overview

BiteTrack is a RESTful API for small food businesses to manage sellers, products, customers, sales, and food waste. All API endpoints are prefixed with `/bitetrack/` and use JWT-based authentication with role-based access control.

**Base URL:** `http://localhost:3000/bitetrack`

## Authentication

All endpoints (except login and activate) require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Role-Based Access Control

- **user**: Basic CRUD operations on products, customers, and sales; self-update profile
- **admin**: All user permissions + create pending sellers
- **superadmin**: All admin permissions + role management + password recovery

---

## Authentication Endpoints

### Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate a seller and receive JWT token.

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "seller": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "dateOfBirth": "1990-05-15",
    "role": "user",
    "createdBy": "507f1f77bcf86cd799439012",
    "activatedAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "statusCode": 401
}

// 400 Bad Request
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ],
  "statusCode": 400
}
```

### Activate Account

**Endpoint:** `POST /auth/activate`

**Description:** Activate a pending seller account by providing security information and setting a password.

**Request Body:**

```json
{
  "email": "jane.smith@example.com",
  "dateOfBirth": "1985-12-08",
  "lastName": "Smith",
  "password": "NewSecure123!"
}
```

**Response (201 Created):**

```json
{
  "id": "507f1f77bcf86cd799439013",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "dateOfBirth": "1985-12-08",
  "role": "user",
  "createdBy": "507f1f77bcf86cd799439011",
  "activatedAt": "2024-01-15T14:20:00.000Z",
  "updatedAt": "2024-01-15T14:20:00.000Z"
}
```

### Password Recovery

**Endpoint:** `POST /auth/recover` (superadmin only)

**Description:** Generate a password reset token for a seller.

**Request Headers:**

```
Authorization: Bearer <superadmin_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "sellerId": "507f1f77bcf86cd799439013"
}
```

**Response (200 OK):**

```json
{
  "token": "reset_abc123def456ghi789",
  "sellerId": "507f1f77bcf86cd799439013",
  "expiresAt": "2024-01-16T14:20:00.000Z"
}
```

### Reset Password

**Endpoint:** `POST /auth/reset`

**Description:** Reset password using a valid reset token.

**Request Body:**

```json
{
  "token": "reset_abc123def456ghi789",
  "email": "jane.smith@example.com",
  "dateOfBirth": "1985-12-08",
  "newPassword": "NewPassword456!"
}
```

**Response (200 OK):**

```json
{
  "message": "Password reset successful"
}
```

### Check Seller Account Status

**Endpoint:** `GET /auth/seller-status`

**Description:** Check if an email address has an active or pending seller account. Useful for client-side login flows to determine whether to show activation form or regular login.

**Query Parameters:**

- `email` (required): Email address to check

**Example:** `GET /auth/seller-status?email=user@example.com`

**Response (200 OK) - Active Account:**

```json
{
  "email": "user@example.com",
  "status": "active"
}
```

**Response (200 OK) - Pending Account:**

```json
{
  "email": "user@example.com",
  "status": "pending"
}
```

**Error Responses:**

```json
// 404 Not Found - No account exists
{
  "error": "Not Found",
  "message": "No account found for this email address",
  "statusCode": 404
}

// 400 Bad Request - Invalid email format
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ],
  "statusCode": 400
}
```

---

## Seller Management

### List Sellers

**Endpoint:** `GET /sellers` (admin/superadmin only)

**Description:** Retrieve all active sellers.

**Request Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Response (200 OK):**

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "dateOfBirth": "1990-05-15",
    "role": "admin",
    "createdBy": "507f1f77bcf86cd799439000",
    "activatedAt": "2024-01-10T09:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### Create Pending Seller

**Endpoint:** `POST /sellers/pending` (admin/superadmin only)

**Description:** Create a new pending seller account.

**Request Headers:**

```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "dateOfBirth": "1992-03-20"
}
```

**Response (201 Created):**

```json
{
  "id": "507f1f77bcf86cd799439014",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "dateOfBirth": "1992-03-20",
  "createdAt": "2024-01-15T16:00:00.000Z",
  "createdBy": "507f1f77bcf86cd799439011",
  "activatedAt": null
}
```

### Update Seller Information

**Endpoint:** `PATCH /sellers/{id}`

**Description:** Update seller's own information (requires old password for sensitive changes).

**Request Headers:**

```
Authorization: Bearer <user_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "firstName": "John Updated",
  "email": "john.updated@example.com",
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response (200 OK):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "firstName": "John Updated",
  "lastName": "Doe",
  "email": "john.updated@example.com",
  "dateOfBirth": "1990-05-15",
  "role": "user",
  "createdBy": "507f1f77bcf86cd799439012",
  "activatedAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T18:45:00.000Z"
}
```

### Change Seller Role

**Endpoint:** `PATCH /sellers/{id}/role` (superadmin only)

**Description:** Promote or demote a seller's role.

**Request Headers:**

```
Authorization: Bearer <superadmin_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "role": "admin"
}
```

**Response (200 OK):**

```json
{
  "id": "507f1f77bcf86cd799439013",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "dateOfBirth": "1985-12-08",
  "role": "admin",
  "createdBy": "507f1f77bcf86cd799439011",
  "activatedAt": "2024-01-15T14:20:00.000Z",
  "updatedAt": "2024-01-15T19:00:00.000Z"
}
```

### Deactivate Seller

**Endpoint:** `DELETE /sellers/{id}` (superadmin only)

**Description:** Deactivate/remove a seller account.

**Request Headers:**

```
Authorization: Bearer <superadmin_jwt_token>
```

**Response (204 No Content):** Empty response body

---

## Customer Management

### List Customers

**Endpoint:** `GET /customers`

**Description:** Retrieve all customers.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
[
  {
    "id": "507f1f77bcf86cd799439020",
    "firstName": "Maria",
    "lastName": "Garcia",
    "phoneNumber": "+1-555-0123",
    "email": "maria.garcia@email.com",
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z",
    "lastTransaction": "2024-01-15T14:30:00.000Z"
  }
]
```

### Create Customer

**Endpoint:** `POST /customers`

**Description:** Create a new customer.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "firstName": "Carlos",
  "lastName": "Rodriguez",
  "phoneNumber": "+1-555-0456",
  "email": "carlos.rodriguez@email.com"
}
```

**Response (201 Created):**

```json
{
  "id": "507f1f77bcf86cd799439021",
  "firstName": "Carlos",
  "lastName": "Rodriguez",
  "phoneNumber": "+1-555-0456",
  "email": "carlos.rodriguez@email.com",
  "createdAt": "2024-01-15T20:00:00.000Z",
  "updatedAt": "2024-01-15T20:00:00.000Z",
  "lastTransaction": null
}
```

### Update Customer

**Endpoint:** `PATCH /customers/{id}`

**Description:** Update customer information.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "phoneNumber": "+1-555-0789",
  "email": "carlos.new@email.com"
}
```

**Response (200 OK):**

```json
{
  "id": "507f1f77bcf86cd799439021",
  "firstName": "Carlos",
  "lastName": "Rodriguez",
  "phoneNumber": "+1-555-0789",
  "email": "carlos.new@email.com",
  "createdAt": "2024-01-15T20:00:00.000Z",
  "updatedAt": "2024-01-15T20:15:00.000Z",
  "lastTransaction": null
}
```

### Get Customer Transaction History

**Endpoint:** `GET /customers/{id}/transactions`

**Description:** Retrieve a customer's transaction history with pagination and filtering options.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 10, max: 100): Number of transactions per page
- `settled` (optional): Filter by settlement status (true/false)

**Examples:**

```bash
# Get first 10 transactions
GET /customers/507f1f77bcf86cd799439020/transactions

# Get page 2 with 5 transactions per page
GET /customers/507f1f77bcf86cd799439020/transactions?page=2&limit=5

# Get only settled transactions
GET /customers/507f1f77bcf86cd799439020/transactions?settled=true

# Get only pending transactions
GET /customers/507f1f77bcf86cd799439020/transactions?settled=false
```

**Response (200 OK):**

```json
{
  "customer": {
    "id": "507f1f77bcf86cd799439020",
    "firstName": "Maria",
    "lastName": "Garcia",
    "phoneNumber": "+1-555-0123",
    "email": "maria.garcia@email.com",
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z",
    "lastTransaction": "2024-01-15T14:30:00.000Z"
  },
  "transactions": [
    {
      "id": "507f1f77bcf86cd799439040",
      "customerId": "507f1f77bcf86cd799439020",
      "sellerId": {
        "id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe"
      },
      "products": [
        {
          "productId": {
            "id": "507f1f77bcf86cd799439030",
            "productName": "Club Sandwich"
          },
          "quantity": 2,
          "priceAtSale": 12.99
        }
      ],
      "totalAmount": 25.98,
      "amountPaid": 25.98,
      "settled": true,
      "createdAt": "2024-01-15T15:30:00.000Z",
      "updatedAt": "2024-01-15T22:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalTransactions": 25,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error Responses:**

```json
// 404 Not Found - Customer doesn't exist
{
  "error": "Not Found",
  "message": "Customer not found",
  "statusCode": 404
}

// 400 Bad Request - Invalid pagination parameters
{
  "error": "Bad Request",
  "message": "Limit must be between 1 and 100",
  "statusCode": 400
}
```

### Import Customers from CSV

**Endpoint:** `POST /customers/import`

**Description:** Bulk import customers from a CSV file.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request Body:**

- `csvFile` (required): CSV file with customer data

**CSV Format:**

```csv
firstName,lastName,phoneNumber,email
John,Doe,+1-555-0101,john.doe@email.com
Jane,Smith,+1-555-0102,jane.smith@email.com
```

**Response (200 OK):**

```json
{
  "message": "CSV import successful",
  "imported": 2,
  "failed": 0,
  "customers": [
    {
      "id": "507f1f77bcf86cd799439022",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1-555-0101",
      "email": "john.doe@email.com",
      "createdAt": "2024-01-16T10:00:00.000Z",
      "updatedAt": "2024-01-16T10:00:00.000Z",
      "lastTransaction": null
    },
    {
      "id": "507f1f77bcf86cd799439023",
      "firstName": "Jane",
      "lastName": "Smith",
      "phoneNumber": "+1-555-0102",
      "email": "jane.smith@email.com",
      "createdAt": "2024-01-16T10:00:00.000Z",
      "updatedAt": "2024-01-16T10:00:00.000Z",
      "lastTransaction": null
    }
  ],
  "errors": []
}
```

**Error Response with Partial Success:**

```json
{
  "message": "CSV import completed with errors",
  "imported": 1,
  "failed": 1,
  "customers": [
    {
      "id": "507f1f77bcf86cd799439022",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1-555-0101",
      "email": "john.doe@email.com",
      "createdAt": "2024-01-16T10:00:00.000Z",
      "updatedAt": "2024-01-16T10:00:00.000Z",
      "lastTransaction": null
    }
  ],
  "errors": [
    {
      "row": 2,
      "email": "invalid-email",
      "error": "Invalid email format"
    }
  ]
}
```

### Delete Customer

**Endpoint:** `DELETE /customers/{id}`

**Description:** Remove a customer.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content):** Empty response body

### Import Customers from CSV

**Endpoint:** `POST /customers/import`

**Description:** Bulk import customers from a CSV file. The import process validates each row and provides detailed reporting of successful imports and failures.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**

- `csvFile`: CSV file with customer data

**Expected CSV Format:**

```csv
firstName,lastName,phoneNumber,email
John,Doe,5551234567,john.doe@example.com
Jane,Smith,5559876543,jane.smith@example.com
Bob,Johnson,5555551234,
Alice,Williams,5551111111,alice.williams@test.com
```

**CSV Requirements:**

- **firstName**: Required, non-empty string
- **lastName**: Required, non-empty string
- **phoneNumber**: Required, exactly 10 digits, must be unique
- **email**: Optional, must be unique if provided
- Maximum file size: 5MB
- Supported formats: .csv files only

**Response (200 OK) - Successful Import:**

```json
{
  "success": true,
  "message": "CSV import completed. 7 customers imported successfully, 0 failed.",
  "summary": {
    "totalRows": 7,
    "successful": 7,
    "failed": 0
  },
  "successfulImports": [
    {
      "row": 1,
      "customer": {
        "id": "507f1f77bcf86cd799439022",
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "5551234567",
        "email": "john.doe@example.com",
        "lastTransaction": null,
        "createdAt": "2024-01-15T22:00:00.000Z",
        "updatedAt": "2024-01-15T22:00:00.000Z"
      }
    }
    // ... more successful imports (limited to first 10 in response)
  ],
  "failures": [],
  "truncated": {
    "successfulImports": false,
    "failures": false
  }
}
```

**Response (200 OK) - Import with Errors:**

```json
{
  "success": true,
  "message": "CSV import completed. 2 customers imported successfully, 3 failed.",
  "summary": {
    "totalRows": 5,
    "successful": 2,
    "failed": 3
  },
  "successfulImports": [
    {
      "row": 1,
      "customer": {
        "id": "507f1f77bcf86cd799439023",
        "firstName": "Valid",
        "lastName": "Customer",
        "phoneNumber": "5551234567",
        "email": "valid@example.com",
        "lastTransaction": null,
        "createdAt": "2024-01-15T22:05:00.000Z",
        "updatedAt": "2024-01-15T22:05:00.000Z"
      }
    }
  ],
  "failures": [
    {
      "row": 2,
      "data": {
        "firstName": "",
        "lastName": "MissingFirst",
        "phoneNumber": "5559876543",
        "email": "missing.first@example.com"
      },
      "errors": [
        {
          "field": "firstName",
          "message": "First name is required"
        }
      ]
    },
    {
      "row": 3,
      "data": {
        "firstName": "Duplicate",
        "lastName": "Phone",
        "phoneNumber": "5551234567",
        "email": "duplicate@example.com"
      },
      "errors": [
        {
          "field": "phoneNumber",
          "message": "Phone number already exists",
          "existingCustomer": {
            "id": "507f1f77bcf86cd799439023",
            "name": "Valid Customer",
            "phoneNumber": "5551234567"
          }
        }
      ]
    }
    // ... more failures (limited to first 20 in response)
  ],
  "truncated": {
    "successfulImports": false,
    "failures": false
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - No file provided
{
  "error": "Bad Request",
  "message": "No CSV file provided",
  "statusCode": 400
}

// 400 Bad Request - Invalid file type
{
  "error": "Bad Request",
  "message": "Only CSV files are allowed",
  "statusCode": 400
}

// 413 Payload Too Large - File too big
{
  "error": "Payload Too Large",
  "message": "File size exceeds 5MB limit",
  "statusCode": 413
}
```

**Import Behavior:**

- **Non-blocking**: Import continues even when individual rows fail
- **Detailed reporting**: Each failure includes row number, data, and specific error reasons
- **Conflict detection**: Identifies duplicate phone numbers and emails with existing customer info
- **Data validation**: Validates all required fields and formats before import
- **Response limiting**: Large imports show first 10 successful and first 20 failed imports in response
- **Atomic per row**: Each customer creation is independent; failures don't affect other rows

**Usage Examples:**

```bash
# Import customers from CSV file
curl -X POST http://localhost:3000/bitetrack/customers/import \
  -H "Authorization: Bearer <jwt_token>" \
  -F "csvFile=@customers.csv"

# Import with jq for pretty output
curl -X POST http://localhost:3000/bitetrack/customers/import \
  -H "Authorization: Bearer <jwt_token>" \
  -F "csvFile=@customers.csv" | jq
```

---

## Product Management

### List Products

**Endpoint:** `GET /products`

**Description:** Retrieve all products with current inventory.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
[
  {
    "id": "507f1f77bcf86cd799439030",
    "productName": "Club Sandwich",
    "description": "Turkey, bacon, lettuce, tomato on toasted bread",
    "count": 25,
    "price": 12.99,
    "createdAt": "2024-01-10T08:00:00.000Z",
    "updatedAt": "2024-01-15T16:00:00.000Z"
  }
]
```

### Create Product

**Endpoint:** `POST /products`

**Description:** Create a new product.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "productName": "Veggie Wrap",
  "description": "Fresh vegetables in a spinach tortilla",
  "count": 15,
  "price": 9.99
}
```

**Response (201 Created):**

```json
{
  "id": "507f1f77bcf86cd799439031",
  "productName": "Veggie Wrap",
  "description": "Fresh vegetables in a spinach tortilla",
  "count": 15,
  "price": 9.99,
  "createdAt": "2024-01-15T21:00:00.000Z",
  "updatedAt": "2024-01-15T21:00:00.000Z"
}
```

### Update Product

**Endpoint:** `PATCH /products/{id}`

**Description:** Update product details or inventory count.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "count": 30,
  "price": 11.99
}
```

**Response (200 OK):**

```json
{
  "id": "507f1f77bcf86cd799439030",
  "productName": "Club Sandwich",
  "description": "Turkey, bacon, lettuce, tomato on toasted bread",
  "count": 30,
  "price": 11.99,
  "createdAt": "2024-01-10T08:00:00.000Z",
  "updatedAt": "2024-01-15T21:15:00.000Z"
}
```

### Remove Product

**Endpoint:** `DELETE /products/{id}`

**Description:** Remove a product from catalog.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content):** Empty response body

---

## Sales Management

### List Sales

**Endpoint:** `GET /sales`

**Description:** Retrieve sales with optional filtering, date range filtering, sorting, and pagination.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `customerId` (optional): Filter by customer
- `sellerId` (optional): Filter by seller
- `settled` (optional): Filter by payment status (true/false)
- `startDate` (optional): Start date for filtering (ISO 8601 format)
- `endDate` (optional): End date for filtering (ISO 8601 format)
- `dateField` (optional): Date field to filter by ('createdAt' or 'updatedAt', default: 'createdAt')
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of records per page (default: 50, max: 100)
- `sort` (optional): Sort field and direction (e.g., 'createdAt', '-createdAt', 'totalAmount', '-totalAmount')

**Examples:**

- Basic filtering: `GET /sales?settled=false&customerId=507f1f77bcf86cd799439020`
- Date range filtering: `GET /sales?startDate=2024-01-01&endDate=2024-01-31&dateField=createdAt`
- Pagination and sorting: `GET /sales?page=2&limit=25&sort=-createdAt`
- Combined filtering: `GET /sales?settled=false&startDate=2024-01-01&page=1&limit=10&sort=-totalAmount`

**Response (200 OK):**

```json
{
  "sales": [
    {
      "id": "507f1f77bcf86cd799439040",
      "customerId": {
        "_id": "507f1f77bcf86cd799439020",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "sellerId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "products": [
        {
          "productId": {
            "_id": "507f1f77bcf86cd799439030",
            "name": "Coffee",
            "price": 12.99
          },
          "quantity": 2,
          "priceAtSale": 12.99
        },
        {
          "productId": {
            "_id": "507f1f77bcf86cd799439031",
            "name": "Croissant",
            "price": 9.99
          },
          "quantity": 1,
          "priceAtSale": 9.99
        }
      ],
      "totalAmount": 35.97,
      "amountPaid": 20.00,
      "settled": false,
      "createdAt": "2024-01-15T15:30:00.000Z",
      "updatedAt": "2024-01-15T15:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalSales": 127,
    "limit": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "filters": {
    "settled": false,
    "customerId": "507f1f77bcf86cd799439020",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z",
    "dateField": "createdAt",
    "sort": "-createdAt"
  }
}
```

### Create Sale

**Endpoint:** `POST /sales`

**Description:** Create a new sale transaction (automatically decrements inventory).

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "customerId": "507f1f77bcf86cd799439020",
  "products": [
    {
      "productId": "507f1f77bcf86cd799439030",
      "quantity": 1
    },
    {
      "productId": "507f1f77bcf86cd799439031",
      "quantity": 2
    }
  ],
  "amountPaid": 25.00
}
```

**Response (201 Created):**

```json
{
  "id": "507f1f77bcf86cd799439041",
  "customerId": "507f1f77bcf86cd799439020",
  "sellerId": "507f1f77bcf86cd799439011",
  "products": [
    {
      "productId": "507f1f77bcf86cd799439030",
      "quantity": 1,
      "priceAtSale": 11.99
    },
    {
      "productId": "507f1f77bcf86cd799439031",
      "quantity": 2,
      "priceAtSale": 9.99
    }
  ],
  "totalAmount": 31.97,
  "amountPaid": 25.00,
  "settled": false,
  "createdAt": "2024-01-15T22:00:00.000Z",
  "updatedAt": "2024-01-15T22:00:00.000Z"
}
```

### Get Sale Details

**Endpoint:** `GET /sales/{id}`

**Description:** Retrieve detailed information about a specific sale.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "id": "507f1f77bcf86cd799439040",
  "customerId": "507f1f77bcf86cd799439020",
  "sellerId": "507f1f77bcf86cd799439011",
  "products": [
    {
      "productId": "507f1f77bcf86cd799439030",
      "quantity": 2,
      "priceAtSale": 12.99
    }
  ],
  "totalAmount": 25.98,
  "amountPaid": 25.98,
  "settled": true,
  "createdAt": "2024-01-15T15:30:00.000Z",
  "updatedAt": "2024-01-15T22:30:00.000Z"
}
```

### Import Sales from CSV

**Endpoint:** `POST /sales/import`

**Description:** Bulk import sales transactions from a CSV file. Automatically decrements inventory.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request Body:**

- `csvFile` (required): CSV file with sales data

**CSV Format:**

```csv
customerId,productId,quantity,amountPaid
507f1f77bcf86cd799439020,507f1f77bcf86cd799439030,2,25.98
507f1f77bcf86cd799439020,507f1f77bcf86cd799439031,1,9.99
```

**Note:** Multiple rows with the same customerId can be grouped into a single sale transaction.

**Response (200 OK):**

```json
{
  "message": "CSV import successful",
  "imported": 2,
  "failed": 0,
  "sales": [
    {
      "id": "507f1f77bcf86cd799439042",
      "customerId": "507f1f77bcf86cd799439020",
      "sellerId": "507f1f77bcf86cd799439011",
      "products": [
        {
          "productId": "507f1f77bcf86cd799439030",
          "quantity": 2,
          "priceAtSale": 12.99
        }
      ],
      "totalAmount": 25.98,
      "amountPaid": 25.98,
      "settled": true,
      "createdAt": "2024-01-16T10:30:00.000Z",
      "updatedAt": "2024-01-16T10:30:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439043",
      "customerId": "507f1f77bcf86cd799439020",
      "sellerId": "507f1f77bcf86cd799439011",
      "products": [
        {
          "productId": "507f1f77bcf86cd799439031",
          "quantity": 1,
          "priceAtSale": 9.99
        }
      ],
      "totalAmount": 9.99,
      "amountPaid": 9.99,
      "settled": true,
      "createdAt": "2024-01-16T10:30:00.000Z",
      "updatedAt": "2024-01-16T10:30:00.000Z"
    }
  ],
  "errors": []
}
```

**Error Response with Partial Success:**

```json
{
  "message": "CSV import completed with errors",
  "imported": 1,
  "failed": 1,
  "sales": [
    {
      "id": "507f1f77bcf86cd799439042",
      "customerId": "507f1f77bcf86cd799439020",
      "sellerId": "507f1f77bcf86cd799439011",
      "products": [
        {
          "productId": "507f1f77bcf86cd799439030",
          "quantity": 2,
          "priceAtSale": 12.99
        }
      ],
      "totalAmount": 25.98,
      "amountPaid": 25.98,
      "settled": true,
      "createdAt": "2024-01-16T10:30:00.000Z",
      "updatedAt": "2024-01-16T10:30:00.000Z"
    }
  ],
  "errors": [
    {
      "row": 2,
      "productId": "507f1f77bcf86cd799439031",
      "error": "Insufficient stock"
    }
  ]
}
```

### Settle Sale

**Endpoint:** `PATCH /sales/{id}/settle`

**Description:** Update payment amount for a sale (marks as settled if fully paid).

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "amountPaid": 31.97
}
```

**Response (200 OK):**

```json
{
  "id": "507f1f77bcf86cd799439041",
  "customerId": "507f1f77bcf86cd799439020",
  "sellerId": "507f1f77bcf86cd799439011",
  "products": [
    {
      "productId": "507f1f77bcf86cd799439030",
      "quantity": 1,
      "priceAtSale": 11.99
    },
    {
      "productId": "507f1f77bcf86cd799439031",
      "quantity": 2,
      "priceAtSale": 9.99
    }
  ],
  "totalAmount": 31.97,
  "amountPaid": 31.97,
  "settled": true,
  "createdAt": "2024-01-15T22:00:00.000Z",
  "updatedAt": "2024-01-15T22:45:00.000Z"
}
```

---

## Sales Reporting & Analytics

### Get Sales Analytics

**Endpoint:** `GET /reporting/sales/analytics`

**Description:** Generate comprehensive sales analytics for a given time period including totals, averages, top products, customer analytics, time-series data, and settlement statistics.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `startDate` (optional): Start date for filtering (ISO 8601 format)
- `endDate` (optional): End date for filtering (ISO 8601 format)
- `dateField` (optional): Date field to filter by ('createdAt' or 'updatedAt', default: 'createdAt')
- `groupBy` (optional): Time grouping for time-series data ('hour', 'day', 'week', 'month', 'year', default: 'day')

**Examples:**

```bash
# Get analytics for January 2024
GET /reporting/sales/analytics?startDate=2024-01-01&endDate=2024-01-31

# Get weekly analytics for the last month
GET /reporting/sales/analytics?startDate=2024-01-01&endDate=2024-01-31&groupBy=week

# Get analytics by updatedAt field
GET /reporting/sales/analytics?dateField=updatedAt&groupBy=month
```

**Response (200 OK):**

```json
{
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z",
    "dateField": "createdAt",
    "groupBy": "day"
  },
  "summary": {
    "totalSales": 127,
    "totalRevenue": 2845.73,
    "totalAmountPaid": 2720.50,
    "averageOrderValue": 22.41,
    "averageItemsPerOrder": 2.3
  },
  "timeSeries": [
    {
      "_id": {
        "year": 2024,
        "month": 1,
        "day": 15
      },
      "salesCount": 12,
      "revenue": 245.88,
      "averageOrderValue": 20.49
    }
  ],
  "topProducts": [
    {
      "productName": "Club Sandwich",
      "currentPrice": 12.99,
      "totalQuantitySold": 85,
      "totalRevenue": 1104.15,
      "salesCount": 42,
      "averagePrice": 12.99
    }
  ],
  "customerAnalytics": {
    "uniqueCustomers": 67,
    "averageCustomerSpent": 42.48,
    "averageOrdersPerCustomer": 1.9
  },
  "paymentAnalytics": {
    "settled": {
      "count": 115,
      "totalAmount": 2720.50,
      "totalPaid": 2720.50
    },
    "unsettled": {
      "count": 12,
      "totalAmount": 125.23,
      "totalPaid": 75.00
    }
  }
}
```

### Export Sales Data as CSV

**Endpoint:** `GET /reporting/sales/export`

**Description:** Export sales data as CSV file with various formats and filtering options. Supports detailed line items, summary per sale, or product performance exports.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `startDate` (optional): Start date for filtering (ISO 8601 format)
- `endDate` (optional): End date for filtering (ISO 8601 format)
- `dateField` (optional): Date field to filter by ('createdAt' or 'updatedAt', default: 'createdAt')
- `format` (optional): Export format ('detailed', 'summary', 'products', default: 'detailed')
- `customerId` (optional): Filter by customer ID
- `sellerId` (optional): Filter by seller ID
- `settled` (optional): Filter by settlement status (true/false)

**Export Formats:**

- **detailed**: Individual product line items with full transaction details
- **summary**: One row per sale with aggregate information
- **products**: Product performance metrics and sales statistics

**Examples:**

```bash
# Export detailed sales data for January 2024
GET /reporting/sales/export?startDate=2024-01-01&endDate=2024-01-31&format=detailed

# Export summary of unsettled sales
GET /reporting/sales/export?settled=false&format=summary

# Export product performance data
GET /reporting/sales/export?format=products&startDate=2024-01-01

# Export specific customer's transactions
GET /reporting/sales/export?customerId=507f1f77bcf86cd799439020&format=detailed
```

**Response (200 OK):**

```
Content-Type: text/csv
Content-Disposition: attachment; filename="bitetrack-sales-detailed-2024-01-15T16-30-00-000Z.csv"

"Sale ID","Date","Time","Customer Name","Customer Email","Seller Name","Product Name","Quantity","Unit Price","Line Total","Sale Total","Amount Paid","Balance Due","Settled"
"507f1f77bcf86cd799439041","2024-01-15","14:30:00","John Doe","john@example.com","Jane Smith","Club Sandwich",2,12.99,25.98,25.98,25.98,0.00,"Yes"
```

**Detailed Format CSV Columns:**

- Sale ID, Date, Time, Customer Name, Customer Email, Seller Name
- Product Name, Quantity, Unit Price, Line Total
- Sale Total, Amount Paid, Balance Due, Settled

**Summary Format CSV Columns:**

- Sale ID, Date, Time, Customer Name, Customer Email, Seller Name
- Items Count, Total Amount, Amount Paid, Balance Due, Settled

**Products Format CSV Columns:**

- Product Name, Current Price, Total Quantity Sold, Number of Sales
- Total Revenue, Average Sale Price, Min/Max Sale Price, Revenue per Unit

**Error Responses:**

```json
// 400 Bad Request - Invalid parameters
{
  "error": "Bad Request",
  "message": "Invalid format. Use: detailed, summary, or products",
  "statusCode": 400
}

// 500 Internal Server Error - CSV generation failed
{
  "error": "Internal Server Error",
  "message": "Failed to generate CSV export",
  "statusCode": 500
}
```

---

## Error Handling

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Request successful, no response body
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid or missing JWT token
- **403 Forbidden**: Insufficient permissions for the operation
- **404 Not Found**: Requested resource doesn't exist
- **500 Internal Server Error**: Server-side error

### Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "statusCode": 400
}
```

### Validation Error Format

For input validation errors:

```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters with mixed case, numbers, and symbols"
    }
  ],
  "statusCode": 400
}
```

---

## Health Check

### API Health Check

**Endpoint:** `GET /bitetrack/health`

**Description:** Check API server status and connectivity. No authentication required.

**Response (200 OK):**

```json
{
  "status": "OK",
  "timestamp": "2024-01-15T23:30:00.000Z",
  "uptime": 86400
}
```

**Response Fields:**

- `status`: Server status (always "OK" if responding)
- `timestamp`: Current server timestamp in ISO 8601 format
- `uptime`: Server uptime in seconds

**Usage:**

- Monitor API availability
- Load balancer health checks
- CI/CD pipeline validation
- Development environment verification

---

## Inventory Drop System (Food Waste Management)

** Admin/SuperAdmin Access Only:** All inventory drop endpoints require `admin` or `superadmin` role.

### Drop Inventory

**Endpoint:** `POST /inventory-drops`

**Description:** Drop inventory for expired, damaged, or end-of-day waste. Creates permanent audit record and updates product inventory atomically.

**Request Headers:**

```
Authorization: Bearer <admin_or_superadmin_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantityToDrop": 5,
  "reason": "end_of_day",
  "notes": "Daily cleanup - product past optimal serving time",
  "productionDate": "2024-01-15T08:00:00.000Z",
  "expirationDate": "2024-01-15T18:00:00.000Z",
  "batchId": "BATCH-001"
}
```

**Required Fields:**

- `productId`: MongoDB ObjectId of the product
- `quantityToDrop`: Number of units to drop (must be ≤ current inventory)

**Optional Fields:**

- `reason`: Drop reason (`expired`, `end_of_day`, `quality_issue`, `damaged`, `contaminated`, `overproduction`, `other`)
- `notes`: Additional context (max 500 characters)
- `productionDate`: When the product was made
- `expirationDate`: Product expiration date
- `batchId`: Batch/lot identifier (max 100 characters)

**Response (201 Created):**

```json
{
  "message": "Inventory dropped successfully",
  "drop": {
    "id": "507f1f77bcf86cd799439014",
    "productId": {
      "id": "507f1f77bcf86cd799439011",
      "productName": "Turkey Sandwich",
      "price": 12.99
    },
    "productName": "Turkey Sandwich",
    "quantityDropped": 5,
    "originalQuantity": 25,
    "remainingQuantity": 20,
    "pricePerUnit": 12.99,
    "totalValueLost": 64.95,
    "reason": "end_of_day",
    "notes": "Daily cleanup - product past optimal serving time",
    "droppedBy": {
      "id": "507f1f77bcf86cd799439012",
      "firstName": "John",
      "lastName": "Admin",
      "email": "admin@business.com"
    },
    "droppedAt": "2024-01-15T18:30:00.000Z",
    "undoExpiresAt": "2024-01-16T02:30:00.000Z",
    "canBeUndone": true,
    "isPartialDrop": true,
    "dropPercentage": "20.00"
  },
  "updatedProduct": {
    "id": "507f1f77bcf86cd799439011",
    "productName": "Turkey Sandwich",
    "previousQuantity": 25,
    "newQuantity": 20,
    "quantityDropped": 5
  },
  "undoInfo": {
    "canUndo": true,
    "undoExpiresAt": "2024-01-16T02:30:00.000Z",
    "timeRemainingMinutes": 479
  }
}
```

### ↩ Undo Inventory Drop

**Endpoint:** `POST /inventory-drops/:dropId/undo`

**Description:** Undo an inventory drop within the 8-hour window. Restores inventory and marks drop as undone.

**Request Headers:**

```
Authorization: Bearer <admin_or_superadmin_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "undoReason": "Accidental drop - product was still good"
}
```

**Response (200 OK):**

```json
{
  "message": "Inventory drop undone successfully",
  "drop": {
    "id": "507f1f77bcf86cd799439014",
    "isUndone": true,
    "undoneBy": {
      "id": "507f1f77bcf86cd799439012",
      "firstName": "John",
      "lastName": "Admin"
    },
    "undoneAt": "2024-01-15T19:00:00.000Z",
    "undoReason": "Accidental drop - product was still good"
  },
  "restoredProduct": {
    "id": "507f1f77bcf86cd799439011",
    "productName": "Turkey Sandwich",
    "previousQuantity": 20,
    "newQuantity": 25,
    "quantityRestored": 5
  }
}
```

### List Inventory Drops

**Endpoint:** `GET /inventory-drops`

**Description:** List inventory drops with filtering and pagination.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `productId`: Filter by specific product
- `reason`: Filter by drop reason
- `droppedBy`: Filter by user who dropped
- `startDate`: Filter drops after date (ISO 8601)
- `endDate`: Filter drops before date (ISO 8601)
- `includeUndone`: Include undone drops (`true`/`false`, default: `false`)

**Example:** `GET /inventory-drops?reason=end_of_day&startDate=2024-01-15&limit=20`

**Response (200 OK):**

```json
{
  "drops": [
    {
      "id": "507f1f77bcf86cd799439014",
      "productName": "Turkey Sandwich",
      "quantityDropped": 5,
      "totalValueLost": 64.95,
      "reason": "end_of_day",
      "droppedBy": {
        "firstName": "John",
        "lastName": "Admin"
      },
      "droppedAt": "2024-01-15T18:30:00.000Z",
      "canBeUndone": true,
      "isUndone": false
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 25,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Get Undoable Drops

**Endpoint:** `GET /inventory-drops/undoable`

**Description:** Get drops that can still be undone (within 8-hour window).

**Query Parameters:**

- `userId`: Filter by specific user (optional)

**Response (200 OK):**

```json
{
  "message": "Found 3 drops that can be undone",
  "undoableDrops": [
    {
      "id": "507f1f77bcf86cd799439014",
      "productName": "Turkey Sandwich",
      "quantityDropped": 5,
      "totalValueLost": 64.95,
      "droppedAt": "2024-01-15T18:30:00.000Z",
      "undoExpiresAt": "2024-01-16T02:30:00.000Z",
      "timeRemainingMinutes": 420
    }
  ],
  "currentTime": "2024-01-15T19:30:00.000Z"
}
```

### Waste Analytics

**Endpoint:** `GET /inventory-drops/analytics`

**Description:** Get comprehensive waste analytics and cost reporting.

**Query Parameters:**

- `startDate`: Analytics period start (default: 30 days ago)
- `endDate`: Analytics period end (default: now)
- `productId`: Filter by specific product
- `reason`: Filter by drop reason
- `droppedBy`: Filter by user

**Response (200 OK):**

```json
{
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-15T23:59:59.000Z",
    "durationDays": 15
  },
  "summary": {
    "totalQuantityDropped": 127,
    "totalValueLost": 1842.73,
    "totalDropCount": 23,
    "avgValuePerDrop": 80.12
  },
  "analyticsByReason": [
    {
      "_id": "end_of_day",
      "totalQuantityDropped": 85,
      "totalValueLost": 1205.45,
      "totalDropCount": 15,
      "products": [
        {
          "productName": "Turkey Sandwich",
          "totalQuantityDropped": 25,
          "totalValueLost": 324.75,
          "dropCount": 5
        }
      ]
    }
  ],
  "todaysSummary": [
    {
      "reason": "end_of_day",
      "totalQuantity": 12,
      "totalValue": 156.88,
      "dropCount": 3,
      "uniqueProducts": 2
    }
  ]
}
```

### Get Drop Details

**Endpoint:** `GET /inventory-drops/:dropId`

**Description:** Get detailed information about a specific inventory drop.

**Response (200 OK):**

```json
{
  "drop": {
    "id": "507f1f77bcf86cd799439014",
    "productName": "Turkey Sandwich",
    "quantityDropped": 5,
    "originalQuantity": 25,
    "remainingQuantity": 20,
    "totalValueLost": 64.95,
    "reason": "end_of_day",
    "notes": "Daily cleanup",
    "droppedBy": {
      "firstName": "John",
      "lastName": "Admin",
      "email": "admin@business.com"
    },
    "droppedAt": "2024-01-15T18:30:00.000Z",
    "undoExpiresAt": "2024-01-16T02:30:00.000Z",
    "isUndone": false,
    "dropPercentage": "20.00",
    "daysSinceProduction": 1
  },
  "canUndo": true,
  "timeRemainingForUndo": 420
}
```

**Error Responses:**

```json
// 403 Forbidden - Insufficient permissions
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "statusCode": 403
}

// 400 Bad Request - Cannot undo expired drop
{
  "error": "Cannot Undo Drop",
  "message": "The undo window for this inventory drop has expired (8 hours)",
  "statusCode": 400
}

// 404 Not Found - Product doesn't exist
{
  "error": "Product Not Found",
  "message": "Product with the specified ID does not exist",
  "statusCode": 404
}

// 400 Bad Request - Insufficient inventory
{
  "error": "Insufficient Inventory",
  "message": "Cannot drop 10 units. Only 5 units available",
  "statusCode": 400
}
```

**Business Rules:**

- **8-Hour Undo Window:** Drops can be undone within 8 hours of creation
- **Admin Access Only:** Only `admin` and `superadmin` roles can perform drop operations
- **Atomic Operations:** Inventory updates and drop records are created/updated together
- **Audit Trail:** Complete tracking of who, what, when, why, and financial impact
- **Partial Drops Supported:** Can drop specific quantities, not just entire inventory
- **Financial Tracking:** Automatic calculation of monetary loss for reporting
- **Compliance Ready:** Detailed records for health department and regulatory compliance

---

## Password Requirements

All passwords must meet the following criteria:

- Minimum 8 characters
- At least 1 lowercase letter
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

**Valid password example:** `SecurePass123!`

---

## Transaction Safety

Sales operations are atomic using MongoDB transactions:

- If any product has insufficient inventory, the entire sale is rejected
- Inventory decrements only occur when the sale is successfully created
- All related database operations either succeed together or fail together

---

## Rate Limiting & Security

- All endpoints are protected against brute force attacks
- JWT tokens expire after a configurable time period
- Passwords are securely hashed using industry-standard algorithms
- All sensitive data is excluded from API responses by default
