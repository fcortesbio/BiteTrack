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
const inventoryDropRoutes = require("./routes/inventoryDrops");
const testDataRoutes = require("./routes/testDataRoutes");
const reportingRoutes = require("./routes/reporting");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

// Import Swagger documentation configuration
const { setupSwaggerUI } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Development environment logging
if (isDevelopment) {
  console.log('🔧 Development mode detected - Enhanced verbosity enabled');
  console.log('📁 Environment file:', process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env');
  console.log('🗄️  MongoDB URI:', process.env.MONGO_URI ? '✅ Configured' : '❌ Missing');
  console.log('🔐 JWT Secret:', process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing');
  console.log('🌍 Frontend URLs:', process.env.FRONTEND_URLS || 'Using defaults');
}

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

// Logging middleware - enhanced verbosity for development
if (isDevelopment) {
  // Detailed development logging with colors and request details
  app.use(morgan(':date[clf] :method :url :status :res[content-length] - :response-time ms :user-agent'));
  
  // Log environment variables confirmation (once)
  console.log('🔍 Development logging enabled - Full request details will be shown');
  console.log('📋 CORS origins:', corsOptions.origin);
} else {
  // Standard production logging
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// Connect to MongoDB with enhanced development information
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    if (isDevelopment) {
      // More detailed MongoDB connection info for development
      const connectionInfo = mongoose.connection;
      console.log('🍃 MongoDB connection established successfully');
      console.log(`📊 MongoDB database: ${connectionInfo.name}`);
      console.log(`🔌 MongoDB host: ${connectionInfo.host}:${connectionInfo.port}`);
      console.log(`🔢 MongoDB connection ID: ${connectionInfo.id}`);
    } else {
      console.log("Connected to MongoDB");
    }
  })
  .catch((error) => {
    console.error("🔴 MongoDB connection error:", error);
    if (isDevelopment) {
      console.error("🧪 Check your .env.development file and MongoDB service status");
      console.error("📌 MongoDB URI format should be: mongodb://username:password@host:port/database");
    }
    process.exit(1);
  });

// Setup Swagger UI Documentation Portal with dynamic port configuration
setupSwaggerUI(app, PORT);

// Welcome route - redirect to interactive documentation
app.get('/', (req, res) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol || 'http';
  
  res.json({
    message: '🍔 Welcome to BiteTrack API - Enterprise Business Intelligence Platform',
    version: '2.0.0+',
    server: {
      host: host,
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    },
    documentation: {
      interactive: `${protocol}://${host}/api-docs`,
      json: `${protocol}://${host}/api-docs.json`,
      static: 'https://github.com/fcortesbio/BiteTrack/blob/main/docs/API-documentation.md'
    },
    capabilities: {
      endpoints: '36 professional API endpoints',
      categories: '9 business management categories',
      features: [
        'Advanced Business Intelligence & Analytics',
        'Food Waste Management & Compliance',
        'Multi-role Authentication & Security',
        'Atomic Transactions & Inventory Management',
        'Professional Testing Infrastructure'
      ]
    },
    quickStart: {
      step1: 'Visit /api-docs for interactive documentation',
      step2: 'Use POST /bitetrack/auth/login to get JWT token',
      step3: 'Add Bearer token to Authorization header',
      step4: 'Explore all 36 endpoints with live testing'
    },
    health: `${req.protocol}://${req.get('host')}/bitetrack/health`
  });
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

// Start server with enhanced development information
app.listen(PORT, () => {
  console.log(`\n🚀 BiteTrack API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  
  if (isDevelopment) {
    console.log('\n📝 Development Server Information:');
    console.log(`🔗 API Base URL: http://localhost:${PORT}/bitetrack`);
    console.log(`📚 Interactive Docs: http://localhost:${PORT}/api-docs`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/bitetrack/health`);
    console.log(`📊 API Overview: http://localhost:${PORT}/`);
    console.log('\n🚀 Ready for development! File changes will trigger automatic restart.');
    console.log('📂 Watching files: *.js, *.json, *.yaml');
  }
  
  console.log('\n✨ Server ready - Happy coding! ✨\n');
});

module.exports = app;
