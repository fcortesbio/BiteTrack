/**
 * Unit Tests for Product Model
 * Tests schema validation, virtuals, and transforms
 */

const Product = require('../../../models/Product');

describe('Product Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid product with required fields', () => {
      const productData = {
        productName: 'Deluxe Sandwich',
        count: 50,
        price: 12.99,
      };

      const product = new Product(productData);
      const validationError = product.validateSync();

      expect(validationError).toBeUndefined();
      expect(product.productName).toBe('Deluxe Sandwich');
      expect(product.count).toBe(50);
      expect(product.price).toBe(12.99);
    });

    it('should fail validation when required fields are missing', () => {
      const product = new Product({});
      const validationError = product.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.productName).toBeDefined();
      expect(validationError.errors.price).toBeDefined();
    });

    it('should trim productName', () => {
      const productData = {
        productName: '  Sandwich  ',
        count: 10,
        price: 5.99,
      };

      const product = new Product(productData);

      expect(product.productName).toBe('Sandwich');
    });

    it('should trim description', () => {
      const productData = {
        productName: 'Sandwich',
        description: '  A delicious sandwich  ',
        count: 10,
        price: 5.99,
      };

      const product = new Product(productData);

      expect(product.description).toBe('A delicious sandwich');
    });

    it('should default description to empty string', () => {
      const productData = {
        productName: 'Sandwich',
        count: 10,
        price: 5.99,
      };

      const product = new Product(productData);

      expect(product.description).toBe('');
    });

    it('should default count to 0', () => {
      const productData = {
        productName: 'Sandwich',
        price: 5.99,
      };

      const product = new Product(productData);

      expect(product.count).toBe(0);
    });

    it('should accept valid count values', () => {
      const validCounts = [0, 1, 50, 100];

      validCounts.forEach(count => {
        const productData = {
          productName: 'Test Product',
          count,
          price: 9.99,
        };

        const product = new Product(productData);
        const validationError = product.validateSync();

        expect(validationError).toBeUndefined();
        expect(product.count).toBe(count);
      });
    });

    it('should reject negative count values', () => {
      const productData = {
        productName: 'Sandwich',
        count: -5,
        price: 5.99,
      };

      const product = new Product(productData);
      const validationError = product.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.count).toBeDefined();
      expect(validationError.errors.count.message).toContain('Path `count`');
    });

    it('should accept valid price values', () => {
      const validPrices = [0, 0.99, 5.50, 25.00, 100.99];

      validPrices.forEach(price => {
        const productData = {
          productName: 'Test Product',
          count: 10,
          price,
        };

        const product = new Product(productData);
        const validationError = product.validateSync();

        expect(validationError).toBeUndefined();
        expect(product.price).toBe(price);
      });
    });

    it('should reject negative price values', () => {
      const productData = {
        productName: 'Sandwich',
        count: 10,
        price: -2.50,
      };

      const product = new Product(productData);
      const validationError = product.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.price).toBeDefined();
      expect(validationError.errors.price.message).toContain('Path `price`');
    });

    it('should include timestamps when saved', () => {
      // Note: Timestamps are only populated when document is saved to database
      // In unit tests, we can only verify the schema has timestamp configuration
      const product = new Product({
        productName: 'Sandwich',
        count: 10,
        price: 5.99,
      });

      // Timestamps might be undefined in unit tests without database save
      expect(product.schema.options.timestamps).toBe(true);
    });
  });

  describe('Virtual Fields', () => {
    it('should have name virtual field that returns productName', () => {
      const productData = {
        productName: 'Deluxe Sandwich',
        count: 10,
        price: 12.99,
      };

      const product = new Product(productData);

      expect(product.name).toBe('Deluxe Sandwich');
      expect(product.name).toBe(product.productName);
    });

    it('should update name virtual when productName changes', () => {
      const product = new Product({
        productName: 'Original Sandwich',
        count: 10,
        price: 5.99,
      });

      expect(product.name).toBe('Original Sandwich');

      product.productName = 'Updated Sandwich';

      expect(product.name).toBe('Updated Sandwich');
    });
  });

  describe('toJSON Transform', () => {
    it('should transform _id to id and include name field', () => {
      const productData = {
        productName: 'Test Sandwich',
        description: 'A test sandwich',
        count: 25,
        price: 8.99,
      };

      const product = new Product(productData);
      const json = product.toJSON();

      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.id).toBeDefined();
      expect(json.name).toBe('Test Sandwich');
      expect(json.productName).toBe('Test Sandwich');
      expect(json.description).toBe('A test sandwich');
      expect(json.count).toBe(25);
      expect(json.price).toBe(8.99);
    });

    it('should include virtual fields in JSON output', () => {
      const product = new Product({
        productName: 'Virtual Test',
        count: 5,
        price: 15.50,
      });

      const json = product.toJSON();

      expect(json.name).toBe('Virtual Test');
      expect(json.name).toBe(json.productName);
    });

    it('should have proper JSON transform configuration', () => {
      const product = new Product({
        productName: 'Timestamp Test',
        count: 1,
        price: 1.99,
      });

      const json = product.toJSON();

      // Focus on testing the transform function rather than timestamps
      expect(json.id).toBeDefined();
      expect(json.name).toBe('Timestamp Test');
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });

    it('should handle empty description in JSON output', () => {
      const product = new Product({
        productName: 'No Description',
        count: 3,
        price: 7.50,
      });

      const json = product.toJSON();

      expect(json.description).toBe('');
    });
  });

  describe('Schema Structure', () => {
    it('should have correct field types', () => {
      const schema = Product.schema;

      expect(schema.paths.productName.instance).toBe('String');
      expect(schema.paths.description.instance).toBe('String');
      expect(schema.paths.count.instance).toBe('Number');
      expect(schema.paths.price.instance).toBe('Number');
    });

    it('should have correct field requirements', () => {
      const schema = Product.schema;

      expect(schema.paths.productName.options.required).toBe(true);
      expect(schema.paths.description.options.required).toBeUndefined();
      expect(schema.paths.count.options.required).toBe(true);
      expect(schema.paths.price.options.required).toBe(true);
    });

    it('should have timestamps enabled', () => {
      const schema = Product.schema;

      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });

    it('should have name virtual defined', () => {
      const schema = Product.schema;

      expect(schema.virtuals.name).toBeDefined();
    });
  });
});