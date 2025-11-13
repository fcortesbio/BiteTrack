import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();
const PORT = process.env.MCP_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "BiteTrack MCP Server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🤖 BiteTrack MCP Server - AI-Powered Operations",
    version: "1.0.0",
    capabilities: [
      "Natural language sales processing",
      "Inventory queries and management",
      "Business analytics and reporting",
      "Customer interaction handling",
    ],
    status: "Boilerplate - Ready for implementation",
    docs: "/api-docs",
    health: "/health",
  });
});

// Placeholder MCP endpoints (to be implemented)
app.post("/chat", (req, res) => {
  res.json({
    message: "MCP chat endpoint - Coming soon",
    received: req.body,
  });
});

app.post("/tools/execute", (req, res) => {
  res.json({
    message: "MCP tool execution endpoint - Coming soon",
    received: req.body,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "MCP endpoint not found",
    path: req.originalUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("MCP Server Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🤖 BiteTrack MCP Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
