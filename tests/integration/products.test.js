/**
 * Products Routes Integration Tests
 * Tests all product management endpoints
 */
const request = require("supertest");
const app = require("../../testApp");
const Product = require("../../models/Product");
const Seller = require("../../models/Seller");

describe("Product Management Routes", () => {
  let authToken;
  let testSeller;

  // Setup authentication for all tests
  beforeEach(async () => {
    // Create a test seller for authentication
    testSeller = new Seller({
      firstName: "Generic",
      lastName: "Seller",
      email: "salesman@bitetrack.io",
      password: "TestPassword123!",
      dateOfBirth: new Date("1998-04-21"),
      role: "user",
      createdBy: testUtils.generateObjectId(),
    });
    await testSeller.save();

    // Login to get auth token
    const loginResponse = await request(app)
      .post("/bitetrack/auth/login")
      .send({
        email: "salesman@bitetrack.io",
        password: "TestPassword123!",
      });

    authToken = loginResponse.body.token;
  });

  describe("POST /bitetrack/products", () => {
    it("should create a new product with valid data", async () => {
      // Arrange
      const productData = {
        productName: "Delicious Sandwich",
        description: "A mouth-watering sandwich with fresh ingredients",
        price: 12.99,
        count: 25,
      };

      // Act
      const response = await request(app)
        .post("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(productData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.productName).toBe(productData.productName);
      expect(response.body.description).toBe(productData.description);
      expect(response.body.price).toBe(productData.price);
      expect(response.body.count).toBe(productData.count);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("updatedAt");

      // Verify product was saved to database
      const savedProduct = await Product.findById(response.body.id);
      expect(savedProduct).toBeTruthy();
      expect(savedProduct.productName).toBe(productData.productName);
    });

    it("should create product with minimum required fields", async () => {
      // Arrange
      const minimalProductData = {
        productName: "Simple product",
        price: 500,
        count: 10,
      };

      // Act
      const response = await request(app)
        .post("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(minimalProductData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.productName).toBe(minimalProductData.productName);
      expect(response.body.price).toBe(minimalProductData.price);
      expect(response.body.count).toBe(minimalProductData.count);
      expect(response.body.description).toBe("");
    });

    it("should reject missing productName", async () => {
      const response = await request(app)
        .post("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ price: 10, count: 5 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("details");
    });

    it("should reject missing price", async () => {
      const response = await request(app)
        .post("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productName: "Testing product", count: 5 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("details");
    });

    it("should reject missing count", async () => {
      const response = await request(app)
        .post("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productName: "Testing product", price: 10 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("details");
    });

    it("should reject negative price", async () => {
      const response = await request(app)
        .post("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productName: "Test", price: -10, count: 5 });

      expect(response.status).toBe(400);
    });

    it("should reject negative count", async () => {
      const response = await request(app)
        .post("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productName: "Test", price: 10, count: -5 });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /bitetrack/products", () => {
    it("should list all products", async () => {
      // Arrange - Create test products
      await Product.create([
        { productName: "Burger", price: 8.99, count: 20, description: "" },
        { productName: "Pizza", price: 12.99, count: 15, description: "" },
        { productName: "Salad", price: 6.99, count: 30, description: "" },
      ]);

      // Act
      const response = await request(app)
        .get("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty("productName");
      expect(response.body[0]).toHaveProperty("price");
      expect(response.body[0]).toHaveProperty("count");
    });

    it("should return empty array when no products exist", async () => {
      const response = await request(app)
        .get("/bitetrack/products")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe("PATCH /bitetrack/products/:id", () => {
    it("should update product price", async () => {
      // Arrange - Create a product
      const product = await Product.create({
        productName: "Test Product",
        price: 10.99,
        count: 50,
        description: "",
      });

      // Act
      const response = await request(app)
        .patch(`/bitetrack/products/${product._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ price: 15.99 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.price).toBe(15.99);
      expect(response.body.productName).toBe("Test Product");

      // Verify in database
      const updated = await Product.findById(product._id);
      expect(updated.price).toBe(15.99);
    });

    it("should update product count", async () => {
      // Arrange
      const product = await Product.create({
        productName: "Test Product",
        price: 10.99,
        count: 50,
        description: "",
      });

      // Act
      const response = await request(app)
        .patch(`/bitetrack/products/${product._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ count: 75 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(75);
    });

    it("should update multiple fields at once", async () => {
      // Arrange
      const product = await Product.create({
        productName: "Test Product",
        price: 10.99,
        count: 50,
        description: "",
      });

      // Act
      const response = await request(app)
        .patch(`/bitetrack/products/${product._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productName: "Updated Product",
          price: 20.99,
          count: 100,
          description: "Updated description",
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.productName).toBe("Updated Product");
      expect(response.body.price).toBe(20.99);
      expect(response.body.count).toBe(100);
      expect(response.body.description).toBe("Updated description");
    });

    it("should return 404 for non-existent product", async () => {
      const fakeId = testUtils.generateObjectId();

      const response = await request(app)
        .patch(`/bitetrack/products/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ price: 15.99 });

      expect(response.status).toBe(404);
    });

    it("should reject invalid price in update", async () => {
      const product = await Product.create({
        productName: "Test Product",
        price: 10.99,
        count: 50,
        description: "",
      });

      const response = await request(app)
        .patch(`/bitetrack/products/${product._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ price: -10 });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /bitetrack/products/:id", () => {
    it("should delete existing product", async () => {
      // Arrange
      const product = await Product.create({
        productName: "To Delete",
        price: 5.99,
        count: 10,
        description: "",
      });

      // Act
      const response = await request(app)
        .delete(`/bitetrack/products/${product._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");

      // Verify deletion
      const deleted = await Product.findById(product._id);
      expect(deleted).toBeNull();
    });

    it("should return 404 for non-existent product", async () => {
      const fakeId = testUtils.generateObjectId();

      const response = await request(app)
        .delete(`/bitetrack/products/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it("should reject invalid ObjectId", async () => {
      const response = await request(app)
        .delete("/bitetrack/products/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("Authentication requirements", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).get("/bitetrack/products");

      expect(response.status).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/bitetrack/products")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });
});
