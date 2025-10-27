/**
 * Inventory Drop System Integration Tests
 * Tests all food waste management endpoints
 */
const request = require("supertest");
const app = require("../../testApp");
const InventoryDrop = require("../../models/InventoryDrop");
const Product = require("../../models/Product");
const Seller = require("../../models/Seller");

describe("Inventory Drop System Routes", () => {
  let adminToken;
  let userToken;
  let adminSeller;
  let userSeller;
  let testProduct;

  beforeEach(async () => {
    // Create admin seller
    adminSeller = new Seller({
      firstName: "Admin",
      lastName: "User",
      email: "admin@test.com",
      password: "AdminPassword123!",
      dateOfBirth: new Date("1990-01-01"),
      role: "admin",
      createdBy: testUtils.generateObjectId(),
    });
    await adminSeller.save();

    // Create regular user seller
    userSeller = new Seller({
      firstName: "Regular",
      lastName: "User",
      email: "user@test.com",
      password: "UserPassword123!",
      dateOfBirth: new Date("1990-01-01"),
      role: "user",
      createdBy: adminSeller._id,
    });
    await userSeller.save();

    // Login as admin
    const adminLogin = await request(app)
      .post("/bitetrack/auth/login")
      .send({ email: "admin@test.com", password: "AdminPassword123!" });
    adminToken = adminLogin.body.token;

    // Login as user
    const userLogin = await request(app)
      .post("/bitetrack/auth/login")
      .send({ email: "user@test.com", password: "UserPassword123!" });
    userToken = userLogin.body.token;

    // Create test product
    testProduct = await Product.create({
      productName: "Test Product",
      price: 10.99,
      count: 100,
      description: "Test",
    });
  });

  describe("POST /bitetrack/inventory-drops", () => {
    it("should create inventory drop with admin role", async () => {
      const dropData = {
        productId: testProduct._id.toString(),
        quantityToDrop: 5,
        reason: "expired",
        notes: "Product past expiration date",
      };

      const response = await request(app)
        .post("/bitetrack/inventory-drops")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(dropData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.quantityDropped).toBe(5);
      expect(response.body.reason).toBe("expired");
      expect(response.body.undoWindowExpiry).toBeTruthy();
      expect(response.body.canUndo).toBe(true);

      // Verify inventory was decremented
      const updated = await Product.findById(testProduct._id);
      expect(updated.count).toBe(95);
    });

    it("should reject drop from regular user", async () => {
      const dropData = {
        productId: testProduct._id.toString(),
        quantityToDrop: 5,
        reason: "expired",
      };

      const response = await request(app)
        .post("/bitetrack/inventory-drops")
        .set("Authorization", `Bearer ${userToken}`)
        .send(dropData);

      expect(response.status).toBe(403);

      // Verify inventory was not changed
      const product = await Product.findById(testProduct._id);
      expect(product.count).toBe(100);
    });

    it("should reject drop with insufficient inventory", async () => {
      const dropData = {
        productId: testProduct._id.toString(),
        quantityToDrop: 150,
        reason: "expired",
      };

      const response = await request(app)
        .post("/bitetrack/inventory-drops")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(dropData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Insufficient inventory");
    });

    it("should reject drop with invalid product ID", async () => {
      const dropData = {
        productId: testUtils.generateObjectId(),
        quantityToDrop: 5,
        reason: "expired",
      };

      const response = await request(app)
        .post("/bitetrack/inventory-drops")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(dropData);

      expect(response.status).toBe(404);
    });

    it("should accept all valid reason codes", async () => {
      const reasons = [
        "expired",
        "end_of_day",
        "quality_issue",
        "damaged",
        "contaminated",
        "overproduction",
        "other",
      ];

      for (const reason of reasons) {
        // Create fresh product for each test
        const product = await Product.create({
          productName: `Product ${reason}`,
          price: 5.99,
          count: 20,
          description: "",
        });

        const response = await request(app)
          .post("/bitetrack/inventory-drops")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            productId: product._id.toString(),
            quantityToDrop: 1,
            reason: reason,
          });

        expect(response.status).toBe(201);
        expect(response.body.reason).toBe(reason);
      }
    });

    it("should calculate cost of dropped inventory", async () => {
      const dropData = {
        productId: testProduct._id.toString(),
        quantityToDrop: 10,
        reason: "expired",
      };

      const response = await request(app)
        .post("/bitetrack/inventory-drops")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(dropData);

      expect(response.status).toBe(201);
      expect(response.body.costOfDrop).toBe(109.9); // 10 * 10.99
    });
  });

  describe("POST /bitetrack/inventory-drops/:dropId/undo", () => {
    it("should undo a recent drop", async () => {
      // Create a drop
      const drop = await InventoryDrop.create({
        productId: testProduct._id,
        productName: testProduct.productName,
        quantityDropped: 10,
        priceAtDrop: testProduct.price,
        reason: "expired",
        droppedBy: adminSeller._id,
      });

      // Decrement product count manually
      await Product.findByIdAndUpdate(testProduct._id, {
        $inc: { count: -10 },
      });

      const response = await request(app)
        .post(`/bitetrack/inventory-drops/${drop._id}/undo`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ undoReason: "Mistake in entry" });

      expect(response.status).toBe(200);
      expect(response.body.isUndone).toBe(true);
      expect(response.body.undoReason).toBe("Mistake in entry");

      // Verify inventory was restored
      const restored = await Product.findById(testProduct._id);
      expect(restored.count).toBe(100);
    });

    it("should reject undo by regular user", async () => {
      const drop = await InventoryDrop.create({
        productId: testProduct._id,
        productName: testProduct.productName,
        quantityDropped: 5,
        priceAtDrop: testProduct.price,
        reason: "expired",
        droppedBy: adminSeller._id,
      });

      const response = await request(app)
        .post(`/bitetrack/inventory-drops/${drop._id}/undo`)
        .set("Authorization", `Bearer ${userToken}`)
        .send();

      expect(response.status).toBe(403);
    });

    it("should reject undo of already undone drop", async () => {
      const drop = await InventoryDrop.create({
        productId: testProduct._id,
        productName: testProduct.productName,
        quantityDropped: 5,
        priceAtDrop: testProduct.price,
        reason: "expired",
        droppedBy: adminSeller._id,
        isUndone: true,
        undoneAt: new Date(),
        undoneBy: adminSeller._id,
      });

      const response = await request(app)
        .post(`/bitetrack/inventory-drops/${drop._id}/undo`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("already been undone");
    });

    it("should reject undo after 8-hour window", async () => {
      // Create drop older than 8 hours
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 9);

      const drop = await InventoryDrop.create({
        productId: testProduct._id,
        productName: testProduct.productName,
        quantityDropped: 5,
        priceAtDrop: testProduct.price,
        reason: "expired",
        droppedBy: adminSeller._id,
        droppedAt: oldDate,
      });

      const response = await request(app)
        .post(`/bitetrack/inventory-drops/${drop._id}/undo`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("undo window has expired");
    });
  });

  describe("GET /bitetrack/inventory-drops", () => {
    beforeEach(async () => {
      // Create multiple drops for filtering
      await InventoryDrop.create([
        {
          productId: testProduct._id,
          productName: testProduct.productName,
          quantityDropped: 5,
          priceAtDrop: testProduct.price,
          reason: "expired",
          droppedBy: adminSeller._id,
        },
        {
          productId: testProduct._id,
          productName: testProduct.productName,
          quantityDropped: 10,
          priceAtDrop: testProduct.price,
          reason: "end_of_day",
          droppedBy: adminSeller._id,
        },
      ]);
    });

    it("should list all drops for admin", async () => {
      const response = await request(app)
        .get("/bitetrack/inventory-drops")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty("quantityDropped");
      expect(response.body[0]).toHaveProperty("reason");
      expect(response.body[0]).toHaveProperty("costOfDrop");
    });

    it("should reject list request from regular user", async () => {
      const response = await request(app)
        .get("/bitetrack/inventory-drops")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /bitetrack/inventory-drops/undoable", () => {
    it("should return only undoable drops", async () => {
      // Create recent drop (undoable)
      await InventoryDrop.create({
        productId: testProduct._id,
        productName: testProduct.productName,
        quantityDropped: 5,
        priceAtDrop: testProduct.price,
        reason: "expired",
        droppedBy: adminSeller._id,
      });

      // Create old drop (not undoable)
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 9);
      await InventoryDrop.create({
        productId: testProduct._id,
        productName: testProduct.productName,
        quantityDropped: 10,
        priceAtDrop: testProduct.price,
        reason: "expired",
        droppedBy: adminSeller._id,
        droppedAt: oldDate,
      });

      const response = await request(app)
        .get("/bitetrack/inventory-drops/undoable")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].quantityDropped).toBe(5);
    });

    it("should reject request from regular user", async () => {
      const response = await request(app)
        .get("/bitetrack/inventory-drops/undoable")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /bitetrack/inventory-drops/analytics", () => {
    beforeEach(async () => {
      // Create drops for analytics
      await InventoryDrop.create([
        {
          productId: testProduct._id,
          productName: testProduct.productName,
          quantityDropped: 5,
          priceAtDrop: 10.99,
          reason: "expired",
          droppedBy: adminSeller._id,
        },
        {
          productId: testProduct._id,
          productName: testProduct.productName,
          quantityDropped: 10,
          priceAtDrop: 10.99,
          reason: "end_of_day",
          droppedBy: adminSeller._id,
        },
      ]);
    });

    it("should return waste analytics summary", async () => {
      const response = await request(app)
        .get("/bitetrack/inventory-drops/analytics")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalQuantityDropped");
      expect(response.body).toHaveProperty("totalCost");
      expect(response.body).toHaveProperty("dropsByReason");
      expect(response.body.totalQuantityDropped).toBe(15);
      expect(response.body.totalCost).toBeCloseTo(164.85, 2);
    });

    it("should reject analytics request from regular user", async () => {
      const response = await request(app)
        .get("/bitetrack/inventory-drops/analytics")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /bitetrack/inventory-drops/:dropId", () => {
    it("should return drop details by ID", async () => {
      const drop = await InventoryDrop.create({
        productId: testProduct._id,
        productName: testProduct.productName,
        quantityDropped: 5,
        priceAtDrop: testProduct.price,
        reason: "expired",
        notes: "Test notes",
        droppedBy: adminSeller._id,
      });

      const response = await request(app)
        .get(`/bitetrack/inventory-drops/${drop._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(drop._id.toString());
      expect(response.body.quantityDropped).toBe(5);
      expect(response.body.reason).toBe("expired");
      expect(response.body.notes).toBe("Test notes");
    });

    it("should return 404 for non-existent drop", async () => {
      const fakeId = testUtils.generateObjectId();

      const response = await request(app)
        .get(`/bitetrack/inventory-drops/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it("should reject request from regular user", async () => {
      const drop = await InventoryDrop.create({
        productId: testProduct._id,
        productName: testProduct.productName,
        quantityDropped: 5,
        priceAtDrop: testProduct.price,
        reason: "expired",
        droppedBy: adminSeller._id,
      });

      const response = await request(app)
        .get(`/bitetrack/inventory-drops/${drop._id}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });
});
