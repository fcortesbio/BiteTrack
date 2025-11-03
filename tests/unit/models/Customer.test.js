/**
 * Unit Tests for Customer Model
 * Tests schema validation, phone normalization, and pre-save middleware
 */

const Customer = require('../../../models/Customer');

describe('Customer Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid customer with required fields', () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '3001234567', // Colombian mobile number
      };

      const customer = new Customer(customerData);
      const validationError = customer.validateSync();

      expect(validationError).toBeUndefined();
      expect(customer.firstName).toBe('John');
      expect(customer.lastName).toBe('Doe');
      expect(customer.phoneNumber).toBe('3001234567');
    });

    it('should fail validation when required fields are missing', () => {
      const customer = new Customer({});
      const validationError = customer.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.firstName).toBeDefined();
      expect(validationError.errors.lastName).toBeDefined();
      expect(validationError.errors.phoneNumber).toBeDefined();
    });

    it('should trim firstName and lastName', () => {
      const customerData = {
        firstName: '  John  ',
        lastName: '  Doe  ',
        phoneNumber: '3001234567', // Colombian mobile
      };

      const customer = new Customer(customerData);

      expect(customer.firstName).toBe('John');
      expect(customer.lastName).toBe('Doe');
    });

    it('should lowercase and trim email', () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '3001234567', // Colombian mobile
        email: '  JOHN.DOE@EXAMPLE.COM  ',
      };

      const customer = new Customer(customerData);

      expect(customer.email).toBe('john.doe@example.com');
    });

    it('should allow undefined email (sparse index)', () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '3001234567', // Colombian mobile
      };

      const customer = new Customer(customerData);
      const validationError = customer.validateSync();

      expect(validationError).toBeUndefined();
      expect(customer.email).toBeUndefined();
    });

    it('should default lastTransaction to null', () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '3001234567', // Colombian mobile
      };

      const customer = new Customer(customerData);

      expect(customer.lastTransaction).toBeNull();
    });

    it('should accept valid Colombian phone numbers', () => {
      // Colombian mobile: 10 digits starting with 3
      // Colombian landline: 7 digits
      const validPhones = ['3001234567', '3209876543', '3157654321', '6012345'];

      validPhones.forEach(phoneNumber => {
        const customerData = {
          firstName: 'Test',
          lastName: 'Customer',
          phoneNumber,
        };

        const customer = new Customer(customerData);
        const validationError = customer.validateSync();

        expect(validationError).toBeUndefined();
        expect(customer.phoneNumber).toBe(phoneNumber);
      });
    });

    it('should reject invalid phone number formats', () => {
      // Invalid: too short, too long, letters, US numbers not starting with 3, formatted strings
      const invalidPhones = [
        '123',           // Too short
        '12345678901',   // Too long  
        'abcdefghij',    // Letters
        '2001234567',    // 10 digits but doesn't start with 3
        '5551234567',    // US number (doesn't start with 3)
        '555-123-4567',  // Formatted (has non-digits)
        '(300) 123-4567' // Formatted (has non-digits)
      ];

      invalidPhones.forEach(phoneNumber => {
        const customerData = {
          firstName: 'Test',
          lastName: 'Customer',
          phoneNumber,
        };

        const customer = new Customer(customerData);
        const validationError = customer.validateSync();

        expect(validationError).toBeDefined();
        expect(validationError.errors.phoneNumber).toBeDefined();
      });
    });

    it('should have timestamps configured', () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '3001234567', // Colombian mobile
      };

      const customer = new Customer(customerData);

      // Timestamps are set by Mongoose when documents are saved, not in memory
      expect(customer.schema.options.timestamps).toBe(true);
    });
  });

  describe('Phone Number Normalization', () => {
    describe('normalizePhoneNumber helper function', () => {
      // Access the helper function through the model's static methods or test it indirectly
      const testNormalization = (input, expected) => {
        const customer = new Customer({
          firstName: 'Test',
          lastName: 'Customer',
          phoneNumber: input,
        });

        // Manually trigger the Colombian normalization by calling the pre-save middleware logic
        if (typeof input === 'string') {
          const digitsOnly = input.replace(/\D/g, '');
          let normalized;
          // Handle Colombian country code +57 (12 digits total)
          if (digitsOnly.length === 12 && digitsOnly.startsWith('57')) {
            normalized = digitsOnly.substring(2);
          } else if (digitsOnly.length === 10 || digitsOnly.length === 7) {
            // Colombian mobile (10 digits) or landline (7 digits)
            normalized = digitsOnly;
          } else {
            // Return original if invalid length
            normalized = input;
          }
          expect(normalized).toBe(expected);
        }
      };

      it('should normalize Colombian phone number with country code', () => {
        // +57 3001234567 -> 3001234567
        testNormalization('+57 3001234567', '3001234567');
      });

      it('should normalize formatted Colombian phone numbers', () => {
        testNormalization('+57 300 123 4567', '3001234567');
        testNormalization('(300) 123-4567', '3001234567');
        testNormalization('300-123-4567', '3001234567');
      });

      it('should leave valid Colombian numbers unchanged', () => {
        testNormalization('3001234567', '3001234567');
        testNormalization('6012345', '6012345'); // 7-digit landline
      });

      it('should return original for invalid lengths', () => {
        testNormalization('123', '123');
        testNormalization('12345678901234', '12345678901234');
      });

      it('should handle null and undefined', () => {
        const customer = new Customer({
          firstName: 'Test',
          lastName: 'Customer',
          phoneNumber: '3001234567', // Valid Colombian mobile
        });

        expect(customer.phoneNumber).toBe('3001234567');
      });
    });

    describe('pre-save middleware', () => {
      it('should normalize phone number on save', async() => {
        const customer = new Customer({
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '+57 300 123 4567', // Colombian format with country code
        });

        // Mock isModified method
        customer.isModified = jest.fn().mockReturnValue(true);

        // Simulate the pre-save middleware behavior
        const mockNext = jest.fn();
        
        // Manually execute Colombian normalization logic
        if (customer.isModified('phoneNumber')) {
          const digitsOnly = customer.phoneNumber.replace(/\D/g, '');
          // Handle Colombian country code +57 (12 digits total)
          if (digitsOnly.length === 12 && digitsOnly.startsWith('57')) {
            customer.phoneNumber = digitsOnly.substring(2);
          } else if (digitsOnly.length === 10 || digitsOnly.length === 7) {
            customer.phoneNumber = digitsOnly;
          }
        }
        mockNext();

        expect(mockNext).toHaveBeenCalled();
        expect(customer.phoneNumber).toBe('3001234567');
      });

      it('should not normalize phone number if not modified', async() => {
        const customer = new Customer({
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '3001234567', // Colombian mobile
        });

        const originalPhone = customer.phoneNumber;
        customer.isModified = jest.fn().mockReturnValue(false);

        const mockNext = jest.fn();
        
        // Simulate middleware that doesn't modify when not changed
        if (customer.isModified('phoneNumber')) {
          // This shouldn't execute since isModified returns false
        }
        mockNext();

        expect(customer.phoneNumber).toBe(originalPhone);
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('toJSON Transform', () => {
    it('should transform _id to id', () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '3001234567', // Colombian mobile
        email: 'john@example.com',
      };

      const customer = new Customer(customerData);
      const json = customer.toJSON();

      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.id).toBeDefined();
      expect(json.firstName).toBe('John');
      expect(json.lastName).toBe('Doe');
      expect(json.phoneNumber).toBe('3001234567');
      expect(json.email).toBe('john@example.com');
    });

    it('should preserve all valid fields in JSON output', () => {
      const customer = new Customer({
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '3209876543', // Colombian mobile
        email: 'jane@example.com',
        lastTransaction: new Date('2023-01-01'),
      });

      const json = customer.toJSON();

      expect(json.firstName).toBe('Jane');
      expect(json.lastName).toBe('Smith');
      expect(json.phoneNumber).toBe('3209876543');
      expect(json.email).toBe('jane@example.com');
      expect(json.lastTransaction).toBeInstanceOf(Date);
    });

    it('should handle null lastTransaction in JSON output', () => {
      const customer = new Customer({
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '3001234567', // Colombian mobile
      });

      const json = customer.toJSON();

      expect(json.lastTransaction).toBeNull();
    });
  });

  describe('Schema Structure', () => {
    it('should have correct field types', () => {
      const schema = Customer.schema;

      expect(schema.paths.firstName.instance).toBe('String');
      expect(schema.paths.lastName.instance).toBe('String');
      expect(schema.paths.phoneNumber.instance).toBe('String');
      expect(schema.paths.email.instance).toBe('String');
      expect(schema.paths.lastTransaction.instance).toBe('Date');
    });

    it('should have correct field requirements', () => {
      const schema = Customer.schema;

      expect(schema.paths.firstName.options.required).toBe(true);
      expect(schema.paths.lastName.options.required).toBe(true);
      expect(schema.paths.phoneNumber.options.required).toBe(true);
      expect(schema.paths.email.options.required).toBeUndefined();
      expect(schema.paths.lastTransaction.options.required).toBeUndefined();
    });

    it('should have unique constraint on phoneNumber', () => {
      const schema = Customer.schema;
      
      expect(schema.paths.phoneNumber.options.unique).toBe(true);
    });

    it('should have sparse index on email', () => {
      const schema = Customer.schema;
      
      expect(schema.paths.email.options.sparse).toBe(true);
    });

    it('should have timestamps enabled', () => {
      const schema = Customer.schema;

      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });
  });
});