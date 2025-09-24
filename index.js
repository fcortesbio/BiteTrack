require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

// Import routes
const authRoutes = require("./routes/auth");
const sellerRoutes = require("./routes/sellers");
const customerRoutes = require("./routes/customers");
const productRoutes = require("./routes/products");
const salesRoutes = require("./routes/sales");
const testDataRoutes = require("./routes/testDataRoutes");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for reverse proxy deployments (Nginx, Traefik, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - environment-specific origins
const corsOptions = {
  origin: process.env.FRONTEND_URLS ? 
    process.env.FRONTEND_URLS.split(',').map(url => url.trim()) : 
    ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

// logging middleware
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms"),
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Health check endpoint
app.get("/bitetrack/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/bitetrack/auth", authRoutes);
app.use("/bitetrack/sellers", sellerRoutes);
app.use("/bitetrack/customers", customerRoutes);
app.use("/bitetrack/products", productRoutes);
app.use("/bitetrack/sales", salesRoutes);
app.use("/bitetrack/test-data", testDataRoutes);

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

// Start server
app.listen(PORT, () => {
  console.log(`BiteTrack API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
