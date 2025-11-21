import { useState, useEffect } from "react";
import "./App.css";

// Get API and MCP URLs from environment variables
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3004"; // default to port 3004 if no .env file found
const MCP_URL = import.meta.env.VITE_MCP_URL ?? "http://localhost:4004"; // default to port 4004 if no .env file found

function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [mcpStatus, setMcpStatus] = useState(null);
  const [mongoStatus, setMongoStatus] = useState(null);

  useEffect(() => {
    // Check API health
    fetch(`${API_URL}/api/v2/health`)
      .then((res) => {
        if (!res.ok) throw new Error("API health check failed");
        return res.json();
      })
      .then((data) => setApiStatus(data))
      .catch((error) => {
        console.error("API health check error:", error);
        setApiStatus({ status: "ERROR", message: "API unreachable" });
      });

    // Check MCP health
    fetch(`${MCP_URL}/health`)
      .then((res) => {
        if (!res.ok) throw new Error("MCP health check failed");
        return res.json();
      })
      .then((data) => setMcpStatus(data))
      .catch((error) => {
        console.error("MCP health check error:", error);
        setMcpStatus({ status: "ERROR", message: "MCP unreachable" });
      });

    // Check MongoDB health via API
    fetch(`${API_URL}/api/v2/health/mongodb`)
      .then((res) => {
        if (!res.ok) throw new Error("MongoDB health check failed");
        return res.json();
      })
      .then((data) => setMongoStatus(data))
      .catch((error) => {
        console.error("MongoDB health check error:", error);
        setMongoStatus({ status: "ERROR", message: "MongoDB unreachable" });
      });
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍔 BiteTrack</h1>
        <p className="subtitle">Enterprise Business Intelligence Platform</p>
      </header>

      <main className="app-main">
        <div className="hero">
          <h2>Welcome to BiteTrack</h2>
          <p>Comprehensive business management for food businesses</p>
        </div>

        <div className="features">
          <div className="feature-card">
            <h3>📊 Analytics</h3>
            <p>Real-time sales reporting and business intelligence</p>
          </div>
          <div className="feature-card">
            <h3>📦 Inventory</h3>
            <p>Track stock levels and food waste compliance</p>
          </div>
          <div className="feature-card">
            <h3>🤖 AI Assistant</h3>
            <p>Natural language business operations</p>
          </div>
        </div>

        <div className="status-section">
          <h3>System Status</h3>
          <div className="status-cards">
            <div
              className={`status-card ${apiStatus?.status === "OK" ? "ok" : "error"}`}
            >
              <h4>🔧 API Service</h4>
              <p>Status: {apiStatus?.status || "Checking..."}</p>
              {apiStatus?.uptime && (
                <small>Uptime: {Math.floor(apiStatus.uptime)}s</small>
              )}
            </div>
            <div
              className={`status-card ${mcpStatus?.status === "OK" ? "ok" : "error"}`}
            >
              <h4>🤖 MCP Service</h4>
              <p>Status: {mcpStatus?.status || "Checking..."}</p>
              {mcpStatus?.uptime && (
                <small>Uptime: {Math.floor(mcpStatus.uptime)}s</small>
              )}
            </div>
            <div
              className={`status-card ${mongoStatus?.status === "connected" ? "ok" : "error"}`}
            >
              <h4>MongoDB</h4>
              <p>Status: {mongoStatus?.status || "Checking..."}</p>
              {mongoStatus?.database && (
                <small>Database: {mongoStatus.database}</small>
              )}
            </div>
          </div>
        </div>

        <div className="cta">
          <h3>Ready to Get Started?</h3>
          <p>This is a boilerplate interface. Full dashboard coming soon!</p>
          <div className="button-group">
            <a href="/api/v2/docs" className="button primary" target="_blank">
              API Docs
            </a>
            <a
              href="/api/v2/health"
              className="button secondary"
              target="_blank"
            >
              API Health
            </a>
            <a href="/mcp/" className="button secondary" target="_blank">
              MCP Info
            </a>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>
          BiteTrack v2.0 | Built with React + Vite | Powered by Express +
          MongoDB
        </p>
      </footer>
    </div>
  );
}

export default App;
