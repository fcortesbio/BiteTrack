# CSV Sales Import Feature Specification

## Overview

This document outlines the implementation plan for extending BiteTrack's Sales model to support bulk import of sales data via CSV files. This feature enables integration with external data collection systems (e.g., Google Forms) while maintaining complete backwards compatibility with existing functionality.

## Business Requirements

### **Primary Goal**
Enable self-service sales data aggregation by importing historical sales records from CSV files, supporting businesses that collect sales data through external forms or manual processes.

### **Key Business Drivers**
- **Data Migration**: Import historical sales data from spreadsheets or external systems
- **Self-Service Integration**: Support Google Forms → CSV → BiteTrack workflow
- **Audit Trail**: Maintain proof of sales with receipt links
- **Batch Processing**: Handle large volumes of sales data efficiently

## Technical Architecture

### **Core Principle: Backwards Compatibility**
The existing Sales model is mission-critical with extensive dependencies across:
- Transaction processing (`saleController.js`)
- Business intelligence (`reportingController.js`)
- Customer analytics (`customerController.js`)
- Inventory management systems

**All existing functionality must remain unaffected.**

## Sales Model Extensions

### **New Optional Fields**
The following fields will be added to `models/Sale.js`. All fields are optional to ensure backwards compatibility:

| Field Name | Type | Default | Purpose |
|------------|------|---------|---------|
| `originalCreatedAt` | Date | `createdAt` value | **CRITICAL**: Historical timestamp from CSV for accurate reporting |
| `importedAt` | Date | Current timestamp | Audit trail for import operation |
| `externalSale` | Boolean | `false` | Differentiates imported sales from API-created sales |
| `receiptUrl` | String | `null` | Link to proof of sale (e.g., Google Drive) |
| `importBatch` | String | `null` | Batch identifier for tracking and potential rollbacks |
| `paymentMethod` | String | `null` | Payment method captured from external forms |

### **Schema Impact**
```javascript
// BEFORE (existing schema remains unchanged)
{
  customerId: ObjectId (required),
  sellerId: ObjectId (required),
  products: [{ productId, quantity, priceAtSale }] (required),
  totalAmount: Number (required),
  amountPaid: Number (required),
  settled: Boolean,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

// AFTER (with new optional fields)
{
  // ... all existing fields unchanged ...
  originalCreatedAt: Date, // NEW: Historical timestamp
  importedAt: Date, // NEW: Import audit trail
  externalSale: Boolean, // NEW: Import flag
  receiptUrl: String, // NEW: Proof link
  importBatch: String, // NEW: Batch tracking
  paymentMethod: String // NEW: Payment method
}
```

## New Feature Implementation

### **Endpoint Definition**
```
POST /sales/import
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

Form Data:
- csvFile: CSV file containing sales data
```

### **Expected CSV Format**
```csv
customerName,contact,productName,quantity,amountPaid,paymentMethod,timestamp,receiptUrl
John Doe,5551234567,Club Sandwich,2,15.50,Card,10/4/2024 14:30:15,https://drive.google.com/file/d/abc123
Jane Smith,jane@example.com,Coffee,1,0,Cash,10/4/2024 14:45:00,
Bob Johnson,5559876543,Burger Combo,1,12.99,Transfer,10/4/2024 15:00:30,https://drive.google.com/file/d/def456
```

**Column Definitions**:
- `customerName`: Full customer name (for reference only)
- `contact`: Email address OR phone number (10 digits)
- `productName`: Exact product name (case-insensitive matching)
- `quantity`: Number of items sold (integer ≥ 1)
- `amountPaid`: Amount paid (≥ 0, zero allowed for pending payments)
- `paymentMethod`: Payment method string (optional)
- `timestamp`: Sale timestamp (MM/DD/YYYY HH:mm:ss format)
- `receiptUrl`: Link to proof of sale (optional)

## Import Processing Flow

### **Phase 1: Interception and Parsing**
1. **Authentication**: Extract `sellerId` from JWT token
2. **File Validation**: Verify CSV format and headers
3. **Memory Optimization**: Process file in chunks of 100 rows
4. **Data Parsing**: Convert CSV rows to structured data

### **Phase 2: Row-by-Row Validation**
For each CSV row, perform sequential validation:

#### **2.1 Customer Resolution**
```javascript
// Lookup existing customer by contact
const customer = await Customer.findOne({
  $or: [
    { email: contact.toLowerCase() }, // If contact looks like email
    { phoneNumber: contact } // If contact is 10-digit phone
  ]
});

if (!customer) {
  skip_reason = 'customer_not_found';
  continue;
}
```

#### **2.2 Duplicate Detection**
```javascript
// Check for existing sale with same customer and exact timestamp
const existingSale = await Sale.findOne({
  customerId: customer._id,
  originalCreatedAt: parsedTimestamp
});

if (existingSale) {
  skip_reason = 'already_registered';
  continue;
}
```

#### **2.3 Product Lookup**
```javascript
// Case-insensitive product name matching
const product = await Product.findOne({
  productName: { $regex: new RegExp(`^${productName}$`, 'i') }
});

if (!product) {
  skip_reason = 'product_not_found';
  continue;
}
```

#### **2.4 Payment Validation**
```javascript
const totalAmount = product.price * quantity;

if (amountPaid < 0) {
  skip_reason = 'negative_payment';
  continue;
}

// Note: Zero payments allowed (pending sales)
// Note: Overpayments allowed (tips, etc.)
```

### **Phase 3: Data Transformation and Insertion**
Transform valid CSV rows into Sale documents:

```javascript
const saleData = {
  customerId: customer._id,
  sellerId: req.user._id, // Importing user
  products: [{
    productId: product._id,
    quantity: parseInt(quantity),
    priceAtSale: product.price // Current price at import time
  }],
  totalAmount: product.price * quantity,
  amountPaid: parseFloat(amountPaid),
  settled: amountPaid >= (product.price * quantity),

  // New fields for CSV import
  originalCreatedAt: parsedTimestamp, // Historical timestamp
  importedAt: new Date(), // Import timestamp
  externalSale: true, // External sale flag
  receiptUrl: receiptUrl || null, // Proof link
  importBatch: batchId, // Batch identifier
  paymentMethod: paymentMethod || null // Payment method
};
```

## Skip Reasons and Error Handling

### **Comprehensive Skip Matrix**
| Skip Reason | Description | Action |
|-------------|-------------|---------|
| `customer_not_found` | No customer found with provided contact | Require manual customer creation |
| `already_registered` | Sale exists with same customer + timestamp | Skip to prevent duplicates |
| `product_not_found` | No product matches the provided name | Verify product name spelling |
| `negative_payment` | Payment amount is negative | Correct payment amount |
| `invalid_date_format` | Timestamp cannot be parsed | Fix timestamp format |
| `required_field_missing` | Missing required CSV column | Complete required data |

### **Error Response Format**
```javascript
{
  success: true,
  summary: {
    totalRows: 150,
    imported: 142,
    skipped: 8,
    importBatchId: "batch_20241004_093057"
  },
  importedSales: [
    // First 10 successfully imported sales
  ],
  skippedRows: [
    {
      row: 15,
      data: { customerName: "Unknown Customer", contact: "unknown@example.com" },
      skip_reason: "customer_not_found"
    }
    // ... up to 20 skipped rows
  ],
  warnings: [
    "3 sales had zero payment amounts (marked as pending)",
    "5 sales had overpayment amounts"
  ]
}
```

## Reporting System Updates

### **Critical Query Migration**
All time-series reporting must use `originalCreatedAt` instead of `createdAt`:

**Files requiring updates:**
- `controllers/reportingController.js` - All aggregation queries
- `controllers/saleController.js` - Date filtering in `listSales`

**Migration strategy:**
```javascript
// BEFORE
{ $match: { createdAt: { $gte: startDate, $lte: endDate } }}

// AFTER
{ $match: {
  $expr: {
    $and: [
      { $gte: [{ $ifNull: ['$originalCreatedAt', '$createdAt'] }, startDate] },
      { $lte: [{ $ifNull: ['$originalCreatedAt', '$createdAt'] }, endDate] }
    ]
  }
}}
```

This ensures compatibility with both existing sales (using `createdAt`) and imported sales (using `originalCreatedAt`).

## Business Logic Decisions

### **Inventory Impact**
**Decision**: External sales DO affect inventory (same as regular sales)
- Inventory decrements normally during import
- Ensures accurate stock levels regardless of sale origin

### **Customer Transaction Updates**
**Decision**: External sales update `customer.lastTransaction`
- Maintains accurate customer analytics
- Preserves customer engagement tracking

### **Duplicate Prevention Strategy**
**Decision**: Exact timestamp matching for duplicate detection
- Same customer + exact timestamp = duplicate
- Enables safe re-import of same CSV file
- Prevents accidental double-counting

### **Product Matching Strategy**
**Decision**: Case-insensitive exact matching
- "Club Sandwich" matches "club sandwich"
- No fuzzy matching initially (can be added later)
- Clear matching rules reduce ambiguity

## Expected Outcomes

### **Primary Benefits**
1. **Seamless Data Migration**: Import historical sales data maintaining chronological accuracy
2. **External System Integration**: Support Google Forms → CSV → BiteTrack workflow
3. **Audit Compliance**: Complete audit trail with proof links and batch tracking
4. **Backwards Compatibility**: Zero impact on existing functionality

### **Success Metrics**
- All existing APIs continue to work unchanged
- Time-series reporting accurately reflects historical dates
- Large CSV files (1000+ rows) process efficiently
- Duplicate imports result in zero additional records
- Inventory levels remain accurate after import

### **Data Integrity Guarantees**
- **Transactional Safety**: Each import is atomic (all valid sales or none)
- **Reference Integrity**: All customer, product, and seller references validated
- **Timeline Accuracy**: Historical dates preserved for accurate reporting
- **Audit Trail**: Complete tracking of import operations and sources

## Implementation Phases

### **Phase 1: Model and Infrastructure**
- Extend Sales model with new optional fields
- Update test data to match new schema
- Implement memory-optimized CSV processing

### **Phase 2: Core Import Logic**
- Customer and product lookup functions
- Validation pipeline with skip matrix
- Data transformation and batch processing

### **Phase 3: Integration and Testing**
- Add route and controller implementation
- Update reporting queries for `originalCreatedAt`
- Comprehensive testing with various CSV formats

### **Phase 4: Documentation and Deployment**
- API documentation updates
- User guide for CSV format requirements
- Production deployment and monitoring

## Technical Benefits

### **Performance Optimizations**
- **Chunked Processing**: Handle large files without memory issues
- **Batch Validation**: Validate all rows before any database writes
- **Efficient Lookups**: Optimized customer and product query patterns

### **Maintainability**
- **Clear Separation**: `externalSale` flag differentiates import sources
- **Audit Trail**: Complete tracking for troubleshooting and compliance
- **Rollback Capability**: `importBatch` enables selective data removal if needed

### **Scalability**
- **Memory Efficient**: Streaming CSV processing prevents memory exhaustion
- **Database Friendly**: Bulk operations minimize database load
- **Progress Tracking**: Batch processing enables monitoring of large imports

---

This specification provides a comprehensive foundation for implementing CSV sales import while maintaining BiteTrack's reliability and backwards compatibility.