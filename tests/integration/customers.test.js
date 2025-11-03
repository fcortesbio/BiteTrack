/**
 * Customer Management Routes Integration Tests
 * Tests all customer management endpoints
 */
const request = require("supertest");
const app = require("../../testApp");
const Customer = require("../../models/Customer");
const Seller = require("../../models/Seller");
const Sale = require("../../models/Sale");
const Product = require("../../models/Product");

describe("Customer Management Routes", () => {
  let authToken;
  let testSeller;

  beforeEach(async () => {
    // Create test seller and get auth token
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

    const loginResponse = await request(app)
      .post("/bitetrack/auth/login")
      .send({ email: "seller@test.com", password: "TestPassword123!" });

    authToken = loginResponse.body.token;
  });

  describe("POST /bitetrack/customers", () => {
    it("should create a new customer with valid data", async () => {
      const customerData = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phoneNumber: "+57 300 123 4567",
      };

      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(customerData);

      expect(response.status).toBe(201);
      expect(response.body.firstName).toBe(customerData.firstName);
      expect(response.body.lastName).toBe(customerData.lastName);
      expect(response.body.email).toBe(customerData.email);
      expect(response.body.phoneNumber).toBe("3001234567"); // Normalized from +57 300 123 4567
      expect(response.body).toHaveProperty("id");

      // Verify in database
      const saved = await Customer.findById(response.body.id);
      expect(saved).toBeTruthy();
      expect(saved.firstName).toBe(customerData.firstName);
    });

    it("should create customer with minimum required fields", async () => {
      const customerData = {
        firstName: "Jane",
        lastName: "Smith",
        phoneNumber: "3001234567",
      };

      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(customerData);

      expect(response.status).toBe(201);
      expect(response.body.firstName).toBe(customerData.firstName);
      expect(response.body.lastName).toBe(customerData.lastName);
    });

    it("should reject missing firstName", async () => {
      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ lastName: "Doe" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("details");
    });

    it("should reject missing lastName", async () => {
      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ firstName: "John" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("details");
    });

    it("should reject invalid email format", async () => {
      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "John",
          lastName: "Doe",
          email: "invalid-email",
          phoneNumber: "3001234567",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("details");
    });

    it("should reject missing phoneNumber", async () => {
      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "John",
          lastName: "Doe",
          email: "john@test.com",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("phoneNumber");
    });

    it("should reject invalid Colombian phone number - too short", async () => {
      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "John",
          lastName: "Doe",
          phoneNumber: "123456", // Only 6 digits
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Phone number");
    });

    it("should reject invalid Colombian phone number - mobile not starting with 3", async () => {
      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "John",
          lastName: "Doe",
          phoneNumber: "2001234567", // Starts with 2, not 3
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Phone number");
    });

    it("should reject invalid Colombian phone number - contains letters", async () => {
      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "John",
          lastName: "Doe",
          phoneNumber: "300ABC4567",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Phone number");
    });

    it("should accept valid Colombian landline - 7 digits", async () => {
      const response = await request(app)
        .post("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "John",
          lastName: "Doe",
          phoneNumber: "6012345", // Valid 7-digit landline
        });

      expect(response.status).toBe(201);
      expect(response.body.phoneNumber).toBe("6012345");
    });
  });

  describe("GET /bitetrack/customers", () => {
    it("should list all customers", async () => {
      // Create test customers
      await Customer.create([
        { firstName: "Alice", lastName: "Johnson", email: "alice@test.com", phoneNumber: "3101234567" },
        { firstName: "Bob", lastName: "Williams", email: "bob@test.com", phoneNumber: "3209876543" },
        { firstName: "Charlie", lastName: "Brown", phoneNumber: "3157654321" },
      ]);

      const response = await request(app)
        .get("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty("firstName");
      expect(response.body[0]).toHaveProperty("lastName");
    });

    it("should return empty array when no customers exist", async () => {
      const response = await request(app)
        .get("/bitetrack/customers")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe("PATCH /bitetrack/customers/:id", () => {
    it("should update customer information", async () => {
      const customer = await Customer.create({
        firstName: "Original",
        lastName: "Name",
        email: "original@test.com",
        phoneNumber: "3001234567",
      });

      const response = await request(app)
        .patch(`/bitetrack/customers/${customer._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "Updated",
          email: "updated@test.com",
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe("Updated");
      expect(response.body.email).toBe("updated@test.com");
      expect(response.body.lastName).toBe("Name");

      // Verify in database
      const updated = await Customer.findById(customer._id);
      expect(updated.firstName).toBe("Updated");
    });

    it("should update phone number", async () => {
      const customer = await Customer.create({
        firstName: "Test",
        lastName: "Customer",
        phoneNumber: "3012345678",
      });

      const response = await request(app)
        .patch(`/bitetrack/customers/${customer._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ phoneNumber: "3209876543" });

      expect(response.status).toBe(200);
      expect(response.body.phoneNumber).toBe("3209876543");
    });

    it("should return 404 for non-existent customer", async () => {
      const fakeId = testUtils.generateObjectId();

      const response = await request(app)
        .patch(`/bitetrack/customers/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ firstName: "Updated" });

      expect(response.status).toBe(404);
    });

    it("should reject invalid email in update", async () => {
      const customer = await Customer.create({
        firstName: "Test",
        lastName: "Customer",
        phoneNumber: "3001122334",
      });

      const response = await request(app)
        .patch(`/bitetrack/customers/${customer._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ email: "invalid-email" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("details");
    });

    it("should reject invalid phone number in update", async () => {
      const customer = await Customer.create({
        firstName: "Test",
        lastName: "Customer",
        phoneNumber: "3001122334",
      });

      const response = await request(app)
        .patch(`/bitetrack/customers/${customer._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ phoneNumber: "12345" }); // Invalid - too short

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Phone number");
    });

    it("should accept Colombian country code format in update", async () => {
      const customer = await Customer.create({
        firstName: "Test",
        lastName: "Customer",
        phoneNumber: "3001122334",
      });

      const response = await request(app)
        .patch(`/bitetrack/customers/${customer._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ phoneNumber: "+57 315 987 6543" }); // With country code and spaces

      expect(response.status).toBe(200);
      expect(response.body.phoneNumber).toBe("3159876543"); // Normalized
    });
  });

  describe("DELETE /bitetrack/customers/:id", () => {
    it("should delete existing customer", async () => {
      const customer = await Customer.create({
        firstName: "To",
        lastName: "Delete",
        phoneNumber: "3005544332",
      });

      const response = await request(app)
        .delete(`/bitetrack/customers/${customer._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");

      // Verify deletion
      const deleted = await Customer.findById(customer._id);
      expect(deleted).toBeNull();
    });

    it("should return 404 for non-existent customer", async () => {
      const fakeId = testUtils.generateObjectId();

      const response = await request(app)
        .delete(`/bitetrack/customers/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /bitetrack/customers/:id/transactions", () => {
    it("should return customer transaction history", async () => {
      // Create customer and product
      const customer = await Customer.create({
        firstName: "Test",
        lastName: "Customer",
        phoneNumber: "3006677889",
      });

      const product = await Product.create({
        productName: "Test Product",
        price: 10.99,
        count: 100,
        description: "",
      });

      // Create sales for this customer
      await Sale.create([
        {
          customerId: customer._id,
          sellerId: testSeller._id,
          products: [
            {
              productId: product._id,
              productName: "Test Product",
              quantity: 2,
              priceAtSale: 10.99,
            },
          ],
          totalAmount: 21.98,
          settled: true,
        },
        {
          customerId: customer._id,
          sellerId: testSeller._id,
          products: [
            {
              productId: product._id,
              productName: "Test Product",
              quantity: 1,
              priceAtSale: 10.99,
            },
          ],
          totalAmount: 10.99,
          settled: false,
        },
      ]);

      const response = await request(app)
        .get(`/bitetrack/customers/${customer._id}/transactions`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty("totalAmount");
      expect(response.body[0]).toHaveProperty("products");
      expect(response.body[0]).toHaveProperty("settled");
    });

    it("should return empty array for customer with no transactions", async () => {
      const customer = await Customer.create({
        firstName: "New",
        lastName: "Customer",
        phoneNumber: "3007788990",
      });

      const response = await request(app)
        .get(`/bitetrack/customers/${customer._id}/transactions`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("should return 404 for non-existent customer", async () => {
      const fakeId = testUtils.generateObjectId();

      const response = await request(app)
        .get(`/bitetrack/customers/${fakeId}/transactions`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Authentication requirements", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).get("/bitetrack/customers");

      expect(response.status).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/bitetrack/customers")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });
});
