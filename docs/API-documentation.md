# BiteTrack API Documentation

## Overview
BiteTrack is a RESTful API for small food businesses to manage sellers, products, customers, and sales. All API endpoints are prefixed with `/bitetrack/` and use JWT-based authentication with role-based access control.

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

### 🔐 Login
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

### 🔓 Activate Account
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

### 🔄 Password Recovery
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

### 🔑 Reset Password
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

### 🔍 Check Seller Account Status
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

### 👥 List Sellers
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

### ➕ Create Pending Seller
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

### ✏️ Update Seller Information
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

### 🔄 Change Seller Role
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

### ❌ Deactivate Seller
**Endpoint:** `DELETE /sellers/{id}` (superadmin only)

**Description:** Deactivate/remove a seller account.

**Request Headers:**
```
Authorization: Bearer <superadmin_jwt_token>
```

**Response (204 No Content):** Empty response body

---

## Customer Management

### 📋 List Customers
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

### ➕ Create Customer
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

### ✏️ Update Customer
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

### 📈 Get Customer Transaction History
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

### ❌ Remove Customer
**Endpoint:** `DELETE /customers/{id}`

**Description:** Remove a customer.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content):** Empty response body

---

## Product Management

### 📦 List Products
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

### ➕ Create Product
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

### ✏️ Update Product
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

### ❌ Remove Product
**Endpoint:** `DELETE /products/{id}`

**Description:** Remove a product from catalog.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (204 No Content):** Empty response body

---

## Sales Management

### 📊 List Sales
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

### ➕ Create Sale
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

### 📄 Get Sale Details
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

### 💰 Settle Sale
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
