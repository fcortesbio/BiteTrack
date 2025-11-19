import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "crypto";
import sessionManager from "./lib/sessionManager.js";
import CodeExecutor from "./lib/codeExecutor.js";

const app = express();
const PORT = process.env.MCP_PORT ?? 4004; // Use MCP_PORT from env, fallback to 4004 (signals env not loaded)
const codeExecutor = new CodeExecutor(sessionManager);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  const stats = sessionManager.getStats();
  res.json({
    status: "OK",
    service: "BiteTrack MCP Server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    sessions: stats.activeSessions,
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "BiteTrack MCP Server - AI-Powered Operations",
    version: "1.0.0",
    capabilities: [
      "Natural language sales processing",
      "Inventory queries and management",
      "Business analytics and reporting",
      "Customer interaction handling",
    ],
    status: "Phase 1: Code execution + Auth implemented",
    endpoints: {
      sse: "/sse",
      execute: "/execute",
      tools: "/tools",
      health: "/health",
    },
  });
});

// SSE endpoint for MCP protocol
app.get("/sse", (req, res) => {
  const sessionId = randomUUID();
  sessionManager.createSession(sessionId);

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial connection event
  res.write(
    `data: ${JSON.stringify({
      type: "connected",
      sessionId,
      message: "MCP server connected",
      capabilities: ["code_execution", "tool_discovery"],
    })}\n\n`,
  );

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`:keepalive\n\n`);
  }, 30000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(keepAlive);
    sessionManager.deleteSession(sessionId);
    console.log(`SSE connection closed: ${sessionId}`);
  });

  console.log(`SSE connection established: ${sessionId}`);
});

// Code execution endpoint
app.post("/execute", async (req, res) => {
  const { code, sessionId } = req.body;

  if (!code) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Code is required",
    });
  }

  if (!sessionId) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Session ID is required",
    });
  }

  try {
    const result = await codeExecutor.execute(code, sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Execution Error",
      message: error.message,
    });
  }
});

// Tools discovery endpoint
app.get("/tools", async (req, res) => {
  const tools = await codeExecutor.getToolsList();
  res.json({
    tools,
    message: "Available tools by category",
  });
});

// Get tool source code
app.get("/tools/:category/:tool", async (req, res) => {
  const { category, tool } = req.params;

  try {
    const source = await codeExecutor.getToolSource(category, tool);
    res.type("text/plain").send(source);
  } catch (error) {
    res.status(404).json({
      error: "Not Found",
      message: `Tool not found: ${category}/${tool}`,
    });
  }
});

// Session info endpoint
app.get("/sessions", (req, res) => {
  const stats = sessionManager.getStats();
  res.json(stats);
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
  console.log(`BiteTrack MCP Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
