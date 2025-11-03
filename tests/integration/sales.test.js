/**
 * Sales Transaction Routes Integration Tests
 * Tests all sales management endpoints
 */
const request = require("supertest");
const app = require("../../testApp");
const Sale = require("../../models/Sale");
const Product = require("../../models/Product");
const Customer = require("../../models/Customer");
const Seller = require("../../models/Seller");

describe("Sales Transaction Routes", () => {
  let authToken;
  let testSeller;
  let testCustomer;
  let testProduct;

  beforeEach(async () => {
    // Create test seller
    testSeller = new Seller({
      firstName: "Test",
      lastName: "Seller",
      email: "seller@test.com",
      password: "TestPassword123!",
      dateOfBirth: new Date("1990-01-01"),
      role: "user",
      createdBy: testUtils.generateObjectId(),
    });
    await testSeller.save();

    // Login
    const loginResponse = await request(app)
      .post("/bitetrack/auth/login")
      .send({ email: "seller@test.com", password: "TestPassword123!" });
    authToken = loginResponse.body.token;

    // Create test customer
    testCustomer = await Customer.create({
      firstName: "Test",
      lastName: "Customer",
      email: "customer@test.com",
      phoneNumber: "3001234567",
    });

    // Create test product
    testProduct = await Product.create({
      productName: "Test Product",
      price: 15.99,
      count: 100,
      description: "Test description",
    });
  });

  describe("POST /bitetrack/sales", () => {
    it("should create a sale with valid data", async () => {
      const saleData = {
        customerId: testCustomer._id.toString(),
        products: [
          {
            productId: testProduct._id.toString(),
            quantity: 2,
          },
        ],
      };

      const response = await request(app)
        .post("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send(saleData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.totalAmount).toBe(31.98); // 2 * 15.99
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].quantity).toBe(2);
      expect(response.body.settled).toBe(false);

      // Verify inventory was decremented
      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.count).toBe(98); // 100 - 2
    });

    it("should create sale with multiple products", async () => {
      const product2 = await Product.create({
        productName: "Product 2",
        price: 5.99,
        count: 50,
        description: "",
      });

      const saleData = {
        customerId: testCustomer._id.toString(),
        products: [
          { productId: testProduct._id.toString(), quantity: 1 },
          { productId: product2._id.toString(), quantity: 3 },
        ],
      };

      const response = await request(app)
        .post("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send(saleData);

      expect(response.status).toBe(201);
      expect(response.body.products).toHaveLength(2);
      expect(response.body.totalAmount).toBe(33.96); // (15.99 * 1) + (5.99 * 3)

      // Verify both inventories were decremented
      const updated1 = await Product.findById(testProduct._id);
      const updated2 = await Product.findById(product2._id);
      expect(updated1.count).toBe(99);
      expect(updated2.count).toBe(47);
    });

    it("should reject sale with insufficient inventory", async () => {
      const saleData = {
        customerId: testCustomer._id.toString(),
        products: [{ productId: testProduct._id.toString(), quantity: 150 }],
      };

      const response = await request(app)
        .post("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send(saleData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Insufficient inventory");

      // Verify inventory was not changed
      const product = await Product.findById(testProduct._id);
      expect(product.count).toBe(100);
    });

    it("should reject sale with invalid customer ID", async () => {
      const saleData = {
        customerId: testUtils.generateObjectId(),
        products: [{ productId: testProduct._id.toString(), quantity: 1 }],
      };

      const response = await request(app)
        .post("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send(saleData);

      expect(response.status).toBe(404);
    });

    it("should reject sale with invalid product ID", async () => {
      const saleData = {
        customerId: testCustomer._id.toString(),
        products: [{ productId: testUtils.generateObjectId(), quantity: 1 }],
      };

      const response = await request(app)
        .post("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send(saleData);

      expect(response.status).toBe(404);
    });

    it("should reject sale with missing customerId", async () => {
      const response = await request(app)
        .post("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          products: [{ productId: testProduct._id.toString(), quantity: 1 }],
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("details");
    });

    it("should reject sale with empty products array", async () => {
      const response = await request(app)
        .post("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          products: [],
        });

      expect(response.status).toBe(400);
    });

    it("should record price at time of sale", async () => {
      const saleData = {
        customerId: testCustomer._id.toString(),
        products: [{ productId: testProduct._id.toString(), quantity: 1 }],
      };

      const response = await request(app)
        .post("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send(saleData);

      expect(response.status).toBe(201);
      expect(response.body.products[0].priceAtSale).toBe(15.99);

      // Change product price
      await Product.findByIdAndUpdate(testProduct._id, { price: 20.99 });

      // Verify sale still has old price
      const sale = await Sale.findById(response.body.id);
      expect(sale.products[0].priceAtSale).toBe(15.99);
    });
  });

  describe("GET /bitetrack/sales", () => {
    beforeEach(async () => {
      // Create multiple sales for filtering tests
      await Sale.create([
        {
          customerId: testCustomer._id,
          sellerId: testSeller._id,
          products: [
            {
              productId: testProduct._id,
              productName: "Test Product",
              quantity: 1,
              priceAtSale: 15.99,
            },
          ],
          totalAmount: 15.99,
          settled: true,
        },
        {
          customerId: testCustomer._id,
          sellerId: testSeller._id,
          products: [
            {
              productId: testProduct._id,
              productName: "Test Product",
              quantity: 2,
              priceAtSale: 15.99,
            },
          ],
          totalAmount: 31.98,
          settled: false,
        },
      ]);
    });

    it("should list all sales", async () => {
      const response = await request(app)
        .get("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty("totalAmount");
      expect(response.body[0]).toHaveProperty("products");
      expect(response.body[0]).toHaveProperty("settled");
    });

    it("should return empty array when no sales exist", async () => {
      await Sale.deleteMany({});

      const response = await request(app)
        .get("/bitetrack/sales")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe("GET /bitetrack/sales/:id", () => {
    it("should return sale details by ID", async () => {
      const sale = await Sale.create({
        customerId: testCustomer._id,
        sellerId: testSeller._id,
        products: [
          {
            productId: testProduct._id,
            productName: "Test Product",
            quantity: 1,
            priceAtSale: 15.99,
          },
        ],
        totalAmount: 15.99,
        settled: false,
      });

      const response = await request(app)
        .get(`/bitetrack/sales/${sale._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(sale._id.toString());
      expect(response.body.totalAmount).toBe(15.99);
      expect(response.body.products).toHaveLength(1);
    });

    it("should return 404 for non-existent sale", async () => {
      const fakeId = testUtils.generateObjectId();

      const response = await request(app)
        .get(`/bitetrack/sales/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /bitetrack/sales/:id/settle", () => {
    it("should settle an unsettled sale", async () => {
      const sale = await Sale.create({
        customerId: testCustomer._id,
        sellerId: testSeller._id,
        products: [
          {
            productId: testProduct._id,
            productName: "Test Product",
            quantity: 1,
            priceAtSale: 15.99,
          },
        ],
        totalAmount: 15.99,
        settled: false,
      });

      const response = await request(app)
        .patch(`/bitetrack/sales/${sale._id}/settle`)
        .set("Authorization", `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.settled).toBe(true);
      expect(response.body).toHaveProperty("settledAt");

      // Verify in database
      const updated = await Sale.findById(sale._id);
      expect(updated.settled).toBe(true);
      expect(updated.settledAt).toBeTruthy();
    });

    it("should reject settling already settled sale", async () => {
      const sale = await Sale.create({
        customerId: testCustomer._id,
        sellerId: testSeller._id,
        products: [
          {
            productId: testProduct._id,
            productName: "Test Product",
            quantity: 1,
            priceAtSale: 15.99,
          },
        ],
        totalAmount: 15.99,
        settled: true,
        settledAt: new Date(),
      });

      const response = await request(app)
        .patch(`/bitetrack/sales/${sale._id}/settle`)
        .set("Authorization", `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("already settled");
    });

    it("should return 404 for non-existent sale", async () => {
      const fakeId = testUtils.generateObjectId();

      const response = await request(app)
        .patch(`/bitetrack/sales/${fakeId}/settle`)
        .set("Authorization", `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(404);
    });
  });

  describe("Authentication requirements", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).get("/bitetrack/sales");

      expect(response.status).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/bitetrack/sales")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });
});
