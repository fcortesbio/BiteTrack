# Customer Validation Enhancement - Manual Testing Guide

## **Enhancement Summary**
- **Phone Number Validation**: Must be exactly 10 digits
- **Duplicate Prevention**: Phone numbers must be unique
- **Email Uniqueness**: Email addresses must be unique (when provided)
- **Enhanced Error Messages**: Detailed conflict information with existing customer data

---

## **Test Cases**

### **1. Valid Customer Creation**
```bash
curl -X POST http://localhost:3001/bitetrack/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "5551234567",
    "email": "john.doe@example.com"
  }'
```
**Expected**: 201 Created with customer data

### **2. Invalid Phone Number Format**
```bash
curl -X POST http://localhost:3001/bitetrack/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": "555-123-4567",
    "email": "jane.smith@example.com"
  }'
```
**Expected**: 400 Bad Request - "Phone number must be exactly 10 digits"

### **3. Phone Number Too Short**
```bash
curl -X POST http://localhost:3001/bitetrack/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Bob",
    "lastName": "Johnson",
    "phoneNumber": "123456789"
  }'
```
**Expected**: 400 Bad Request - "Phone number must be exactly 10 digits"

### **4. Duplicate Phone Number**
```bash
# First, create a customer
curl -X POST http://localhost:3001/bitetrack/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Williams",
    "phoneNumber": "5559876543"
  }'

# Then try to create another with same phone
curl -X POST http://localhost:3001/bitetrack/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Carol",
    "lastName": "Brown",
    "phoneNumber": "5559876543"
  }'
```
**Expected**: 409 Conflict with existing customer information

### **5. Duplicate Email**
```bash
# Create customer with email
curl -X POST http://localhost:3001/bitetrack/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "David",
    "lastName": "Miller",
    "phoneNumber": "5551111111",
    "email": "unique@example.com"
  }'

# Try to create another with same email
curl -X POST http://localhost:3001/bitetrack/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Emma",
    "lastName": "Davis",
    "phoneNumber": "5552222222",
    "email": "unique@example.com"
  }'
```
**Expected**: 409 Conflict with existing customer information

### **6. Update with Invalid Phone**
```bash
# First get an existing customer ID, then:
curl -X PATCH http://localhost:3001/bitetrack/customers/CUSTOMER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "abc1234567"
  }'
```
**Expected**: 400 Bad Request - "Phone number must be exactly 10 digits"

### **7. Update with Duplicate Phone**
```bash
# Try to update customer with existing phone number
curl -X PATCH http://localhost:3001/bitetrack/customers/CUSTOMER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5559876543"
  }'
```
**Expected**: 409 Conflict with existing customer information

---

## **Expected Response Formats**

### **Validation Error (400)**
```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "statusCode": 400,
  "details": [
    {
      "field": "phoneNumber",
      "message": "Phone number must be exactly 10 digits"
    }
  ]
}
```

### **Duplicate Conflict (409)**
```json
{
  "error": "Conflict",
  "message": "A customer with this phone number already exists",
  "statusCode": 409,
  "details": [
    {
      "field": "phoneNumber",
      "message": "Phone number must be unique",
      "existingCustomer": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Alice Williams",
        "phoneNumber": "5559876543"
      }
    }
  ]
}
```

### **Success Response (201)**
```json
{
  "id": "507f1f77bcf86cd799439012",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "5551234567",
  "email": "john.doe@example.com",
  "lastTransaction": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## **Key Improvements Delivered**

1. ** Phone Number Format Enforcement**
   - Strict 10-digit validation (no dashes, spaces, or letters)
   - Applied to both create and update operations
   - Clear error messages for invalid formats

2. ** Comprehensive Duplicate Prevention**
   - Phone number uniqueness enforced at database and application level
   - Email uniqueness when provided
   - Detailed conflict messages with existing customer info

3. ** Enhanced Error Handling**
   - Professional HTTP status codes (400, 409)
   - Detailed error responses with field-specific messages
   - Graceful handling of MongoDB duplicate key errors

4. ** Data Normalization**
   - Automatic trimming of whitespace
   - Lowercase email normalization
   - Proper handling of empty strings vs undefined

5. ** Backward Compatibility**
   - Existing customers remain unaffected
   - API contract maintained with enhanced validation
   - Optional email field still works correctly

---

## **Technical Implementation Details**

### **Database Level**
- Added `unique: true` constraint to phoneNumber field
- Custom validator function for phone number format
- Maintained sparse index on email field

### **Application Level**
- Pre-flight duplicate checks with informative error messages
- Comprehensive input sanitization and normalization
- Fallback error handling for edge cases

### **API Level**
- Express-validator integration for request validation
- Consistent error response format across operations
- Professional HTTP status codes and messaging