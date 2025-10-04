/**
 * Test Application Setup
 * Separate app configuration for testing that skips MongoDB connection
 * since the test setup handles MongoDB Memory Server
 */
require("dotenv").config({ path: '.env.test' });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import routes
const authRoutes = require("./routes/auth");
const sellerRoutes = require("./routes/sellers");
const customerRoutes = require("./routes/customers");
const productRoutes = require("./routes/products");
const salesRoutes = require("./routes/sales");
const inventoryDropRoutes = require("./routes/inventoryDrops");
const testDataRoutes = require("./routes/testDataRoutes");
const reportingRoutes = require("./routes/reporting");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting - more relaxed for testing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for testing
  message: {
    error: "Too Many Requests",
    message: "Too many requests from this IP, please try again later",
    statusCode: 429,
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for testing
app.get("/bitetrack/health", (req, res) => {
  res.json({
    status: "OK",
    environment: "test",
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/bitetrack/auth", authRoutes);
app.use("/bitetrack/sellers", sellerRoutes);
app.use("/bitetrack/customers", customerRoutes);
app.use("/bitetrack/products", productRoutes);
app.use("/bitetrack/sales", salesRoutes);
app.use("/bitetrack/inventory-drops", inventoryDropRoutes);
app.use("/bitetrack/test-data", testDataRoutes);
app.use("/bitetrack/reporting", reportingRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found",
    statusCode: 404,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Export app without starting server (tests will handle this)
module.exports = app;