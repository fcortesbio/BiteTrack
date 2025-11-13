/**
 * Code Executor
 * Sandboxed JavaScript execution environment for agent code
 */

import { VM } from "vm2";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || "http://localhost:3000";
const TIMEOUT_MS = 10000; // 10 seconds

class CodeExecutor {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.toolsDir = path.join(__dirname, "../tools");
  }

  /**
   * Execute user code in sandboxed environment
   * @param {string} code - JavaScript code to execute
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Execution result
   */
  async execute(code, sessionId) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Create API client with JWT token injection
    const apiClient = this.createAPIClient(sessionId);

    // Create session manager wrapper for sandbox
    const sessionManagerWrapper = {
      setToken: (token) => this.sessionManager.setToken(sessionId, token),
      getToken: () => this.sessionManager.getToken(sessionId),
    };

    // Load tools dynamically
    const tools = await this.loadTools();

    // Create sandbox with injected dependencies
    const vm = new VM({
      timeout: TIMEOUT_MS,
      sandbox: {
        console,
        apiClient,
        sessionManager: sessionManagerWrapper,
        ...tools,
      },
    });

    try {
      // Wrap code in async function
      const wrappedCode = `
        (async () => {
          ${code}
        })()
      `;

      const result = await vm.run(wrappedCode);
      session.executionCount++;

      return {
        success: true,
        result,
        sessionId,
      };
    } catch (error) {
      console.error(`Execution error in session ${sessionId}:`, error);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        sessionId,
      };
    }
  }

  /**
   * Create axios client with JWT injection
   * @param {string} sessionId - Session identifier
   * @returns {Object} Configured axios instance
   */
  createAPIClient(sessionId) {
    const instance = axios.create({
      baseURL: API_URL,
      timeout: 5000,
    });

    // Inject JWT token into requests
    instance.interceptors.request.use((config) => {
      const token = this.sessionManager.getToken(sessionId);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return instance;
  }

  /**
   * Load all tools from tools directory
   * @returns {Promise<Object>} Tools object with nested structure
   */
  async loadTools() {
    const tools = {};

    try {
      const categories = await fs.readdir(this.toolsDir);

      for (const category of categories) {
        const categoryPath = path.join(this.toolsDir, category);
        const stat = await fs.stat(categoryPath);

        if (stat.isDirectory()) {
          tools[category] = {};

          const files = await fs.readdir(categoryPath);
          for (const file of files) {
            if (file.endsWith(".js")) {
              const toolPath = path.join(categoryPath, file);
              const toolModule = await import(
                `file://${toolPath}?t=${Date.now()}`
              );

              // Extract all exported functions
              Object.assign(tools[category], toolModule);
            }
          }
        }
      }

      console.log(`Loaded tools:`, Object.keys(tools));
      return tools;
    } catch (error) {
      console.error("Error loading tools:", error);
      return {};
    }
  }

  /**
   * Get list of available tools
   * @returns {Promise<Object>} Tools directory structure
   */
  async getToolsList() {
    const tools = {};

    try {
      const categories = await fs.readdir(this.toolsDir);

      for (const category of categories) {
        const categoryPath = path.join(this.toolsDir, category);
        const stat = await fs.stat(categoryPath);

        if (stat.isDirectory()) {
          const files = await fs.readdir(categoryPath);
          tools[category] = files.filter((f) => f.endsWith(".js"));
        }
      }

      return tools;
    } catch (error) {
      console.error("Error listing tools:", error);
      return {};
    }
  }

  /**
   * Get tool source code
   * @param {string} category - Tool category (e.g., 'auth')
   * @param {string} toolName - Tool filename (e.g., 'login.js')
   * @returns {Promise<string>} Tool source code
   */
  async getToolSource(category, toolName) {
    const toolPath = path.join(this.toolsDir, category, toolName);
    return await fs.readFile(toolPath, "utf-8");
  }
}

export default CodeExecutor;
