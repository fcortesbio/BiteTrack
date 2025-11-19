# Product Integration Tests - Task List

This document outlines all the integration tests that need to be implemented for the Product management endpoints in `tests/integration/products.test.js`.

## Current Status

**COMPLETED:**

- POST /bitetrack/products - Basic creation with valid data
- POST /bitetrack/products - Creation with minimum required fields
- POST /bitetrack/products - Validation error handling

## Endpoints to Test

Based on the routes defined in `routes/products.js`, we have the following endpoints:

- `GET /bitetrack/products` - List products
- `POST /bitetrack/products` - Create product ( COMPLETED)
- `PATCH /bitetrack/products/:id` - Update product
- `DELETE /bitetrack/products/:id` - Delete product

---

## **TO-DO: GET /bitetrack/products (List Products)**

### Test Suite: `describe('GET /bitetrack/products', () => {})`

#### **Basic Functionality Tests**

- [ ] **should return empty array when no products exist**
  - Validate: 200 status, empty array response
  - Validate: Response structure (array format)

- [ ] **should return all products when products exist**
  - Setup: Create 3-5 test products in database
  - Validate: 200 status, correct number of products returned
  - Validate: Each product has all required fields (id, productName, description, price, count, createdAt, updatedAt)
  - Validate: Products are returned as array of objects

- [ ] **should return products with correct data transformation**
  - Validate: MongoDB `_id` is transformed to `id`
  - Validate: `__v` field is not included in response
  - Validate: `createdAt` and `updatedAt` are properly formatted

#### **Authentication Tests**

- [ ] **should reject requests without authentication token**
  - Test: Make request without Authorization header
  - Validate: 401 status, appropriate error message

- [ ] **should reject requests with invalid authentication token**
  - Test: Make request with malformed/expired token
  - Validate: 401 status, appropriate error message

#### **Edge Cases & Performance**

- [ ] **should handle large number of products efficiently**
  - Setup: Create 50+ products in database
  - Validate: 200 status, all products returned
  - Validate: Response time is reasonable (< 1000ms)

- [ ] **should return consistent ordering**
  - Setup: Create products with different timestamps
  - Validate: Products are returned in consistent order (likely by creation time)

---

## **TO-DO: PATCH /bitetrack/products/:id (Update Product)**

### Test Suite: `describe('PATCH /bitetrack/products/:id', () => {})`

#### **Successful Update Tests**

- [ ] **should update product with all valid fields**
  - Setup: Create a test product
  - Test: Update all fields (productName, description, price, count)
  - Validate: 200 status, updated product returned
  - Validate: All fields are properly updated in response and database
  - Validate: `updatedAt` timestamp is modified

- [ ] **should update product with partial valid data**
  - Setup: Create a test product
  - Test: Update only `productName` and `price`
  - Validate: 200 status, only specified fields updated
  - Validate: Other fields remain unchanged
  - Validate: Database reflects changes

- [ ] **should update only productName**
  - Test: Update only productName field
  - Validate: Other fields (description, price, count) unchanged

- [ ] **should update only description**
  - Test: Update only description field (including setting to empty string)
  - Validate: Other fields remain unchanged

- [ ] **should update only price**
  - Test: Update only price field
  - Validate: Other fields remain unchanged

- [ ] **should update only count**
  - Test: Update only count field
  - Validate: Other fields remain unchanged

#### **Validation Error Tests**

- [ ] **should reject invalid productName**
  - Test: Empty string, whitespace-only, null
  - Validate: 400 status, validation error with details

- [ ] **should reject invalid price values**
  - Test: Negative numbers, non-numeric strings, zero, null
  - Validate: 400 status, appropriate validation errors

- [ ] **should reject invalid count values**
  - Test: Negative integers, decimal numbers, non-numeric strings, null
  - Validate: 400 status, appropriate validation errors

- [ ] **should accept valid edge cases**
  - Test: Price as 0.01 (minimum valid price)
  - Test: Count as 0 (valid minimum)
  - Test: Very long but valid productName
  - Validate: 200 status, successful updates

#### **Error Handling Tests**

- [ ] **should return 404 for non-existent product ID**
  - Test: Use valid MongoDB ObjectId format but non-existent ID
  - Validate: 404 status, "Product not found" error message

- [ ] **should return 400 for invalid product ID format**
  - Test: Use invalid ObjectId format (too short, non-hex characters)
  - Validate: 400 status, appropriate error message

#### **Authentication Tests**

- [ ] **should reject requests without authentication token**
  - Test: Make request without Authorization header
  - Validate: 401 status

- [ ] **should reject requests with invalid authentication token**
  - Test: Make request with malformed token
  - Validate: 401 status

#### **Database Consistency Tests**

- [ ] **should maintain data integrity after update**
  - Test: Update product, then fetch it with GET endpoint
  - Validate: Updated data matches between PATCH response and GET response

- [ ] **should handle concurrent updates gracefully**
  - Test: Attempt to update same product simultaneously (if applicable)
  - Validate: Proper error handling or last-write-wins behavior

---

## **TO-DO: DELETE /bitetrack/products/:id (Delete Product)**

### Test Suite: `describe('DELETE /bitetrack/products/:id', () => {})`

#### **Successful Deletion Tests**

- [ ] **should delete existing product successfully**
  - Setup: Create a test product
  - Test: Delete the product using its ID
  - Validate: 204 status (No Content)
  - Validate: Empty response body
  - Validate: Product no longer exists in database

- [ ] **should remove product from database completely**
  - Setup: Create and delete a product
  - Test: Attempt to find deleted product in database
  - Validate: Product is not found (null result)

#### **Error Handling Tests**

- [ ] **should return 404 for non-existent product ID**
  - Test: Use valid MongoDB ObjectId format but non-existent ID
  - Validate: 404 status, "Product not found" error message
  - Validate: Proper error response structure

- [ ] **should return 400 for invalid product ID format**
  - Test: Use invalid ObjectId format (malformed)
  - Validate: 400 status, appropriate error message

- [ ] **should handle deletion of already deleted product**
  - Setup: Create and delete a product
  - Test: Attempt to delete same product again
  - Validate: 404 status, appropriate error message

#### **Authentication Tests**

- [ ] **should reject requests without authentication token**
  - Test: Make DELETE request without Authorization header
  - Validate: 401 status

- [ ] **should reject requests with invalid authentication token**
  - Test: Make DELETE request with invalid/expired token
  - Validate: 401 status

#### **Edge Cases**

- [ ] **should handle deletion when product is referenced elsewhere** _(if applicable)_
  - Test: Delete product that might be referenced in orders/sales
  - Validate: Proper error handling or cascading deletion behavior
  - Note: Check if your system has referential integrity constraints

---

## **TO-DO: POST /bitetrack/products (Additional Edge Cases)**

### Additional tests to complete the POST endpoint coverage:

- [ ] **should handle very large decimal prices**
  - Test: Price with many decimal places (e.g., 999.999999)
  - Validate: Proper rounding/truncation behavior

- [ ] **should handle very large count values**
  - Test: Maximum integer values for count
  - Validate: System can handle large inventory numbers

- [ ] **should validate productName length limits** _(if any)_
  - Test: Very long product names
  - Validate: System behavior with edge cases

- [ ] **should handle special characters in productName and description**
  - Test: Unicode characters, emojis, HTML entities
  - Validate: Proper encoding and storage

- [ ] **should trim whitespace appropriately**
  - Test: Leading/trailing whitespace in productName and description
  - Validate: Fields are properly trimmed as expected

---

## **TO-DO: Cross-Endpoint Integration Tests**

### Test Suite: `describe('Product CRUD Integration', () => {})`

- [ ] **should support full CRUD lifecycle**
  - Test: Create → Read → Update → Delete product
  - Validate: Each step works correctly and data flows properly

- [ ] **should maintain consistency across operations**
  - Test: Create product, verify with GET, update it, verify changes, delete it
  - Validate: Data consistency throughout the lifecycle

- [ ] **should handle product state correctly**
  - Test: Create multiple products, update some, delete others
  - Validate: GET endpoint reflects correct state

---

## **TO-DO: Performance & Load Tests** _(Optional but Recommended)_

- [ ] **should handle concurrent product creation**
  - Test: Multiple simultaneous POST requests
  - Validate: All products created without conflicts

- [ ] **should handle large dataset queries efficiently**
  - Setup: Create 100+ products
  - Test: GET endpoint performance
  - Validate: Response time within acceptable limits

---

## Testing Best Practices to Follow

### **Test Structure**

- Use clear `Arrange → Act → Assert` pattern
- Group related tests in `describe` blocks
- Use descriptive test names that explain what is being tested

### **Data Management**

- Clean database between tests (already handled by `afterEach`)
- Create test data programmatically using `testUtils` helpers
- Use realistic but deterministic test data

### **Assertions**

- Verify HTTP status codes
- Check response body structure and content
- Validate database state when necessary
- Test both positive and negative scenarios

### **Error Testing**

- Test all validation rules from `utils/validation.js`
- Verify error message format and content
- Test authentication and authorization scenarios

### **Coverage Goals**

- Aim for 100% line coverage on Product controller
- Test all validation rules
- Cover all error conditions
- Test authentication on all endpoints

---

## Implementation Notes

1. **Test Data**: Use `testUtils.createTestProduct()` and similar helpers for consistent test data
2. **Authentication**: All endpoints require authentication - test both authenticated and unauthenticated scenarios
3. **Validation**: Reference `utils/validation.js` for exact validation rules to test
4. **Database**: Tests use MongoDB Memory Server - database is isolated and cleaned between tests
5. **Async/Await**: All tests should be async and properly handle promises
6. **Error Format**: API returns errors in format: `{ error, message, statusCode, details? }`

## Estimated Timeline

- **GET /products**: 1-2 days
- **PATCH /products/:id**: 2-3 days
- **DELETE /products/:id**: 1-2 days
- **Additional edge cases**: 1 day
- **Integration tests**: 1 day

**Total: 6-9 days** depending on thoroughness and any issues encountered.

---

_Remember to run `npm run test -- tests/integration/products.test.js` frequently to ensure tests are passing as you implement them!_
