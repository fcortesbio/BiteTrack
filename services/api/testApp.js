/**
 * Test Application Setup
 * Separate app configuration for testing that skips MongoDB connection
 * since the test setup handles MongoDB Memory Server
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Import routes
import authRoutes from "./routes/auth.js";
import sellerRoutes from "./routes/sellers.js";
import customerRoutes from "./routes/customers.js";
import productRoutes from "./routes/products.js";
import salesRoutes from "./routes/sales.js";
import inventoryDropRoutes from "./routes/inventoryDrops.js";
import testDataRoutes from "./routes/testDataRoutes.js";
import reportingRoutes from "./routes/reporting.js";

// Import middleware
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
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
app.get("/api/v2/health", (req, res) => {
  res.json({
    status: "OK",
    environment: "test",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/v2/auth", authRoutes);
app.use("/api/v2/sellers", sellerRoutes);
app.use("/api/v2/customers", customerRoutes);
app.use("/api/v2/products", productRoutes);
app.use("/api/v2/sales", salesRoutes);
app.use("/api/v2/inventory-drops", inventoryDropRoutes);
app.use("/api/v2/test-data", testDataRoutes);
app.use("/api/v2/reporting", reportingRoutes);

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
export default app;
