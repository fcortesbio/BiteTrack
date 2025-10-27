/**
 * BiteTrack Authentication Routes Integration Tests
 * Tests for actual available authentication endpoints
 */
const request = require("supertest");
const app = require("../../testApp");
const Seller = require("../../models/Seller");
const PendingSeller = require("../../models/PendingSeller");
const PasswordResetToken = require("../../models/PasswordResetToken");
const bcrypt = require("bcryptjs");

describe("BiteTrack Authentication Routes", () => {
  describe("POST /bitetrack/auth/login", () => {
    describe("Success scenarios", () => {
      it("should authenticate seller with valid credentials", async () => {
        // Arrange - Create an active seller directly in DB
        const sellerData = {
          firstName: "Login",
          lastName: "Test",
          email: "login.test@example.com",
          password: "LoginPassword123!",
          dateOfBirth: new Date("1990-01-01"),
          role: "user",
          createdBy: testUtils.generateObjectId(),
        };

        const seller = new Seller(sellerData);
        await seller.save();

        // Act
        const response = await request(app).post("/bitetrack/auth/login").send({
          email: sellerData.email,
          password: sellerData.password,
        });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("token");
        expect(response.body).toHaveProperty("seller");
        expect(response.body.seller.email).toBe(sellerData.email);
        expect(response.body.seller).not.toHaveProperty("password");
      });

      it("should return valid JWT token structure", async () => {
        // Arrange - Create an active seller
        const sellerData = {
          firstName: "JWT",
          lastName: "Test",
          email: "jwt.test@example.com",
          password: "JWTPassword123!",
          dateOfBirth: new Date("1990-01-01"),
          role: "user",
          createdBy: testUtils.generateObjectId(),
        };

        const seller = new Seller(sellerData);
        await seller.save();

        // Act
        const response = await request(app).post("/bitetrack/auth/login").send({
          email: sellerData.email,
          password: sellerData.password,
        });

        // Assert
        expect(response.status).toBe(200);
        const { token } = response.body;
        expect(token).toBeTruthy();

        // Decode token without verification to check structure
        const jwt = require("jsonwebtoken");
        const decoded = jwt.decode(token);
        expect(decoded).toHaveProperty("id");
        expect(decoded).toHaveProperty("role");
        expect(decoded).toHaveProperty("exp");
        expect(decoded).toHaveProperty("iat");
        expect(decoded.role).toBe("user");
      });
    });

    describe("Authentication failures", () => {
      it("should reject invalid password", async () => {
        // Arrange - Create an active seller
        const sellerData = {
          firstName: "Invalid",
          lastName: "Test",
          email: "invalid.test@example.com",
          password: "CorrectPassword123!",
          dateOfBirth: new Date("1990-01-01"),
          role: "user",
          createdBy: testUtils.generateObjectId(),
        };

        const seller = new Seller(sellerData);
        await seller.save();

        // Act - Try with wrong password
        const response = await request(app).post("/bitetrack/auth/login").send({
          email: sellerData.email,
          password: "WrongPassword123!",
        });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toContain("Invalid email or password");
        expect(response.body).not.toHaveProperty("token");
      });

      it("should reject non-existent user", async () => {
        // Act
        const response = await request(app).post("/bitetrack/auth/login").send({
          email: "nonexistent@example.com",
          password: "SomePassword123!",
        });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toContain("Invalid email or password");
        expect(response.body).not.toHaveProperty("token");
      });

      it("should reject missing credentials", async () => {
        // Test missing email
        let response = await request(app)
          .post("/bitetrack/auth/login")
          .send({ password: "SomePassword123!" });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");

        // Test missing password
        response = await request(app)
          .post("/bitetrack/auth/login")
          .send({ email: "test@example.com" });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");

        // Test missing both
        response = await request(app).post("/bitetrack/auth/login").send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
      });
    });
  });

  describe("POST /bitetrack/auth/activate", () => {
    describe("Success scenarios", () => {
      it("should activate pending seller with valid data", async () => {
        // Arrange - Create a pending seller first
        const pendingSellerData = {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@test.com",
          dateOfBirth: new Date("1990-01-01"),
          createdBy: testUtils.generateObjectId(),
        };

        const pendingSeller = new PendingSeller(pendingSellerData);
        await pendingSeller.save();

        const activationData = {
          email: pendingSellerData.email,
          lastName: pendingSellerData.lastName,
          dateOfBirth: "1990-01-01",
          password: "SecurePassword123!",
        };

        // Act
        const response = await request(app)
          .post("/bitetrack/auth/activate")
          .send(activationData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.email).toBe(pendingSellerData.email);
        expect(response.body.firstName).toBe(pendingSellerData.firstName);
        expect(response.body).not.toHaveProperty("password");

        // Verify seller was created in active collection
        const seller = await Seller.findOne({ email: pendingSellerData.email });
        expect(seller).toBeTruthy();
        expect(seller.firstName).toBe(pendingSellerData.firstName);

        // Verify pending seller was marked as activated
        const updatedPending = await PendingSeller.findById(pendingSeller._id);
        expect(updatedPending.activatedAt).toBeTruthy();
      });

      it("should hash password before storing", async () => {
        // Arrange - Create a pending seller first
        const pendingSellerData = {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@test.com",
          dateOfBirth: new Date("1995-05-15"),
          createdBy: testUtils.generateObjectId(),
        };

        const pendingSeller = new PendingSeller(pendingSellerData);
        await pendingSeller.save();

        const activationData = {
          email: pendingSellerData.email,
          lastName: pendingSellerData.lastName,
          dateOfBirth: "1995-05-15",
          password: "TestPassword123!",
        };

        // Act
        await request(app)
          .post("/bitetrack/auth/activate")
          .send(activationData);

        // Assert
        const seller = await Seller.findOne({
          email: pendingSellerData.email,
        }).select("+password");
        expect(seller.password).not.toBe(activationData.password);

        // Verify password was properly hashed
        const isValidPassword = await bcrypt.compare(
          activationData.password,
          seller.password,
        );
        expect(isValidPassword).toBe(true);
      });
    });

    describe("Validation errors", () => {
      it("should reject activation with invalid pending seller data", async () => {
        // Act - Try to activate without matching pending seller
        const response = await request(app)
          .post("/bitetrack/auth/activate")
          .send({
            email: "nonexistent@example.com",
            lastName: "Test",
            dateOfBirth: "1990-01-01",
            password: "ValidPassword123!",
          });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toContain("Pending seller not found");
      });

      it("should reject activation of already activated seller", async () => {
        // Arrange - Create and activate a pending seller
        const pendingSellerData = {
          firstName: "Already",
          lastName: "Activated",
          email: "already.activated@test.com",
          dateOfBirth: new Date("1990-01-01"),
          createdBy: testUtils.generateObjectId(),
          activatedAt: new Date(), // Already activated
        };

        const pendingSeller = new PendingSeller(pendingSellerData);
        await pendingSeller.save();

        // Act - Try to activate again
        const response = await request(app)
          .post("/bitetrack/auth/activate")
          .send({
            email: pendingSellerData.email,
            lastName: pendingSellerData.lastName,
            dateOfBirth: "1990-01-01",
            password: "ValidPassword123!",
          });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toContain("already activated");
      });
    });
  });

  describe("GET /bitetrack/auth/seller-status", () => {
    describe("Success scenarios", () => {
      it("should return active status for active seller", async () => {
        // Arrange - Create an active seller
        const sellerData = {
          firstName: "Active",
          lastName: "Seller",
          email: "active.seller@example.com",
          password: "Password123!",
          dateOfBirth: new Date("1990-01-01"),
          role: "user",
          createdBy: testUtils.generateObjectId(),
        };

        const seller = new Seller(sellerData);
        await seller.save();

        // Act
        const response = await request(app)
          .get("/bitetrack/auth/seller-status")
          .query({ email: sellerData.email });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.email).toBe(sellerData.email);
        expect(response.body.status).toBe("active");
      });

      it("should return pending status for pending seller", async () => {
        // Arrange - Create a pending seller
        const pendingSellerData = {
          firstName: "Pending",
          lastName: "Seller",
          email: "pending.seller@example.com",
          dateOfBirth: new Date("1990-01-01"),
          createdBy: testUtils.generateObjectId(),
        };

        const pendingSeller = new PendingSeller(pendingSellerData);
        await pendingSeller.save();

        // Act
        const response = await request(app)
          .get("/bitetrack/auth/seller-status")
          .query({ email: pendingSellerData.email });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.email).toBe(pendingSellerData.email);
        expect(response.body.status).toBe("pending");
      });

      it("should return 404 for non-existent seller", async () => {
        // Act
        const response = await request(app)
          .get("/bitetrack/auth/seller-status")
          .query({ email: "nonexistent@example.com" });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toContain("No account found");
      });
    });

    describe("Validation errors", () => {
      it("should reject missing email query parameter", async () => {
        // Act
        const response = await request(app).get(
          "/bitetrack/auth/seller-status",
        );

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
      });
    });
  });

  describe("POST /bitetrack/auth/reset", () => {
    describe("Success scenarios", () => {
      it("should reset password with valid token and seller details", async () => {
        // Arrange - Create seller and reset token
        const sellerData = {
          firstName: "Reset",
          lastName: "Test",
          email: "reset.test@example.com",
          password: "OldPassword123!",
          dateOfBirth: new Date("1990-01-01"),
          role: "user",
          createdBy: testUtils.generateObjectId(),
        };

        const seller = new Seller(sellerData);
        await seller.save();

        const resetToken = new PasswordResetToken({
          token: "valid-reset-token",
          sellerId: seller._id,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        });
        await resetToken.save();

        // Act
        const response = await request(app).post("/bitetrack/auth/reset").send({
          token: "valid-reset-token",
          email: sellerData.email,
          dateOfBirth: "1990-01-01",
          newPassword: "NewPassword123!",
        });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Password reset successful");

        // Verify password was actually changed
        const updatedSeller = await Seller.findById(seller._id).select(
          "+password",
        );
        const isNewPassword = await bcrypt.compare(
          "NewPassword123!",
          updatedSeller.password,
        );
        expect(isNewPassword).toBe(true);

        // Verify token was deleted
        const deletedToken = await PasswordResetToken.findOne({
          token: "valid-reset-token",
        });
        expect(deletedToken).toBeNull();
      });
    });

    describe("Validation errors", () => {
      it("should reject invalid or expired token", async () => {
        // Act
        const response = await request(app).post("/bitetrack/auth/reset").send({
          token: "invalid-token",
          email: "test@example.com",
          dateOfBirth: "1990-01-01",
          newPassword: "NewPassword123!",
        });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toContain("invalid or expired");
      });

      it("should reject reset with mismatched seller details", async () => {
        // Arrange - Create seller and reset token
        const sellerData = {
          firstName: "Mismatch",
          lastName: "Test",
          email: "mismatch.test@example.com",
          password: "Password123!",
          dateOfBirth: new Date("1990-01-01"),
          role: "user",
          createdBy: testUtils.generateObjectId(),
        };

        const seller = new Seller(sellerData);
        await seller.save();

        const resetToken = new PasswordResetToken({
          token: "valid-token",
          sellerId: seller._id,
          expiresAt: new Date(Date.now() + 3600000),
        });
        await resetToken.save();

        // Act - Use wrong email
        const response = await request(app).post("/bitetrack/auth/reset").send({
          token: "valid-token",
          email: "wrong@example.com",
          dateOfBirth: "1990-01-01",
          newPassword: "NewPassword123!",
        });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toContain("do not match");
      });
    });
  });
});
