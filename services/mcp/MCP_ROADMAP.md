# BiteTrack MCP Server Implementation Roadmap

## Executive Summary

This roadmap outlines the implementation of a Model Context Protocol (MCP) server for BiteTrack that uses **agentic code execution** to enable efficient tool discovery and natural language access to BiteTrack API operations. This approach minimizes context window consumption by exposing tools as a filesystem-based code API rather than loading all tool definitions upfront.

## Architecture Overview

### Core Principle: Code Execution over Direct Tool Calls

Instead of traditional MCP implementations that load all tool definitions into the context window, we'll use an **agentic code execution** pattern:

1. **Filesystem-based Tool Discovery**: Tools are represented as JavaScript modules in a virtual filesystem structure
2. **Progressive Disclosure**: Agents load only the tool definitions they need for the current task
3. **Context Efficiency**: Intermediate results stay in the execution environment, not the model's context
4. **JWT Authentication**: Agents authenticate once and reuse tokens across tool calls

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Warp / AI Client                         │
│              (Anthropic Claude, etc.)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP/SSE (MCP Protocol)
                     │
┌────────────────────▼────────────────────────────────────────┐
│              BiteTrack MCP Server (Port 3001)               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         MCP Protocol Handler                        │   │
│  │  - SSE endpoint (/sse)                              │   │
│  │  - Tool discovery (filesystem-based)                │   │
│  │  - Code execution sandbox                           │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │    Authentication Manager                           │   │
│  │  - JWT storage per session                          │   │
│  │  - Token refresh logic                              │   │
│  │  - Role-based access                                │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │    Tool Filesystem (Virtual)                        │   │
│  │                                                      │   │
│  │  tools/                                             │   │
│  │  ├── auth/                                          │   │
│  │  │   ├── login.js                                   │   │
│  │  │   └── index.js                                   │   │
│  │  ├── sales/                                         │   │
│  │  │   ├── getSales.js                                │   │
│  │  │   ├── getSaleById.js                             │   │
│  │  │   ├── settleSale.js                              │   │
│  │  │   └── index.js                                   │   │
│  │  ├── products/                                      │   │
│  │  │   ├── getProducts.js                             │   │
│  │  │   ├── getProductById.js                          │   │
│  │  │   └── index.js                                   │   │
│  │  ├── customers/                                     │   │
│  │  │   ├── getCustomers.js                            │   │
│  │  │   ├── getCustomerById.js                         │   │
│  │  │   ├── getCustomerTransactions.js                 │   │
│  │  │   └── index.js                                   │   │
│  │  ├── reporting/                                     │   │
│  │  │   ├── getSalesAnalytics.js                       │   │
│  │  │   ├── exportSales.js                             │   │
│  │  │   └── index.js                                   │   │
│  │  └── inventory-drops/                               │   │
│  │      ├── getInventoryDrops.js                       │   │
│  │      ├── getDropAnalytics.js                        │   │
│  │      ├── settleDrop.js                              │   │
│  │      └── index.js                                   │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │    API Client (axios)                               │   │
│  │  - HTTP client with JWT injection                   │   │
│  │  - Retry logic                                      │   │
│  │  - Error handling                                   │   │
│  └──────────────────┬──────────────────────────────────┘   │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      │ HTTP (with JWT Bearer token)
                      │
┌─────────────────────▼────────────────────────────────────────┐
│           BiteTrack API (Port 3000)                          │
│  - /bitetrack/auth/login                                     │
│  - /bitetrack/sales                                          │
│  - /bitetrack/products                                       │
│  - /bitetrack/customers                                      │
│  - /bitetrack/reporting/sales/analytics                      │
│  - /bitetrack/reporting/sales/export                         │
│  - /bitetrack/inventory-drops                                │
└──────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Core MCP Infrastructure with Code Execution (Weeks 1-2)

#### Goal

Implement SSE-based MCP server with filesystem-based tool discovery and code execution sandbox.

#### Tasks

1. **MCP Protocol Implementation**
   - [ ] Implement SSE endpoint (`/sse`) for MCP communication
   - [ ] Add MCP protocol message handling (initialize, tools/list, tools/call)
   - [ ] Implement server capabilities negotiation
   - [ ] Add proper error handling for MCP protocol errors

2. **Code Execution Sandbox**
   - [ ] Create isolated JavaScript execution environment (vm2 or isolated-vm)
   - [ ] Implement safe code execution with timeout limits
   - [ ] Add context injection (API client, utilities)
   - [ ] Implement stdout/stderr capture for console.log output
   - [ ] Add memory and CPU limits for safety

3. **Virtual Filesystem for Tools**
   - [ ] Create virtual filesystem structure for tools
   - [ ] Implement `fs.readdir()` simulation for tool discovery
   - [ ] Implement `fs.readFile()` simulation for loading tool definitions
   - [ ] Add tool categorization (auth, sales, products, customers, reporting, inventory-drops)
   - [ ] Create TypeScript-like type definitions in comments for better LLM understanding

4. **Authentication Foundation**
   - [ ] Add session management (in-memory store with session IDs)
   - [ ] Implement JWT token storage per session
   - [ ] Create `auth/login.js` tool for authentication
   - [ ] Add token injection into API client automatically
   - [ ] Implement token validation and refresh logic

#### Deliverables

- Working SSE MCP server on `/sse` endpoint
- Code execution sandbox that can run agent-generated code
- Virtual filesystem with at least auth and one category (sales) implemented
- Session-based JWT authentication working

#### Success Criteria

- Agent can discover tools by listing directories
- Agent can read tool definitions on-demand
- Agent can execute code that calls tools
- Authentication flow works: login → store JWT → use in subsequent calls

---

### Phase 2: Core Read Operations (Weeks 3-4)

#### Goal

Implement read-only GET operations for all major entities with proper authentication.

#### Tasks

1. **Sales Tools** (`tools/sales/`)
   - [ ] `getSales.js` - List sales with filtering (date range, customer, seller, settlement status)
   - [ ] `getSaleById.js` - Get detailed sale information
   - [ ] Implement pagination handling
   - [ ] Add proper TypeScript-style type definitions

2. **Products Tools** (`tools/products/`)
   - [ ] `getProducts.js` - List products with inventory status
   - [ ] `getProductById.js` - Get detailed product information
   - [ ] Add inventory level checking helpers

3. **Customers Tools** (`tools/customers/`)
   - [ ] `getCustomers.js` - List customers
   - [ ] `getCustomerById.js` - Get customer details
   - [ ] `getCustomerTransactions.js` - Get customer transaction history

4. **Reporting Tools** (`tools/reporting/`)
   - [ ] `getSalesAnalytics.js` - Get analytics with time-series data
   - [ ] `exportSales.js` - Export sales to CSV (detailed/summary/products formats)
   - [ ] Add data transformation utilities for agent-friendly output

5. **Inventory Drops Tools** (`tools/inventory-drops/`)
   - [ ] `getInventoryDrops.js` - List inventory drops with filtering
   - [ ] `getDropAnalytics.js` - Get waste analytics and cost analysis
   - [ ] `getUndoableDrops.js` - List drops within undo window

6. **API Client Enhancement**
   - [ ] Add comprehensive error handling for API responses
   - [ ] Implement retry logic with exponential backoff
   - [ ] Add request/response logging for debugging
   - [ ] Create helper functions for common query patterns

#### Deliverables

- All read operations implemented as tool modules
- Comprehensive error handling
- Agent can query all major entities using natural language

#### Success Criteria

- Agent can answer queries like: "Show me today's sales"
- Agent can filter data: "Find customers who haven't purchased in 30 days"
- Agent can generate analytics: "What are the top 5 products this month?"
- All operations use proper JWT authentication

---

### Phase 3: Write Operations - Settlement (Week 5)

#### Goal

Implement sale settlement functionality (most critical write operation).

#### Tasks

1. **Settlement Tool**
   - [ ] `settleSale.js` - Mark sale as settled/paid
   - [ ] Add batch settlement capability
   - [ ] Implement validation and confirmation flows
   - [ ] Add rollback/undo support if possible

2. **Safety Mechanisms**
   - [ ] Add confirmation prompts for write operations
   - [ ] Implement dry-run mode for testing
   - [ ] Add audit logging for all write operations
   - [ ] Create validation layer to prevent invalid operations

3. **Agent Guidance**
   - [ ] Add clear documentation on when to use settlement
   - [ ] Create examples of safe settlement patterns
   - [ ] Implement guardrails to prevent accidental bulk operations

#### Deliverables

- Settlement tool fully functional
- Safety mechanisms in place
- Agent can settle sales with proper confirmation

#### Success Criteria

- Agent can settle a single sale: "Mark sale #12345 as paid"
- Agent can handle batch operations: "Settle all sales for customer John Doe"
- Confirmation flow prevents accidental operations
- All operations are logged for audit

---

### Phase 4: Advanced Features (Weeks 6-7)

#### Goal

Add context efficiency features, advanced tooling, and optimization.

#### Tasks

1. **Tool Search Function**
   - [ ] Implement `search_tools` function for semantic tool discovery
   - [ ] Add detail level parameter (name only, description, full schema)
   - [ ] Create tool categorization and tagging system
   - [ ] Add fuzzy matching for tool names

2. **Context Optimization**
   - [ ] Implement progressive tool definition loading
   - [ ] Add data filtering in execution environment before returning to model
   - [ ] Create aggregation helpers to reduce output tokens
   - [ ] Implement streaming responses for large datasets

3. **Multi-Step Workflows**
   - [ ] Create workflow templates for common operations
   - [ ] Implement state management for multi-step processes
   - [ ] Add workflow resume capability after interruption
   - [ ] Create workflow examples (e.g., "Generate monthly report and email it")

4. **Error Recovery**
   - [ ] Implement intelligent retry with context preservation
   - [ ] Add fallback strategies for failed operations
   - [ ] Create human-in-the-loop approval for ambiguous operations
   - [ ] Add operation queuing for rate-limited scenarios

5. **Performance Optimization**
   - [ ] Add caching layer for frequently accessed data
   - [ ] Implement request batching for multiple related queries
   - [ ] Add response compression
   - [ ] Optimize tool definition storage and retrieval

#### Deliverables

- `search_tools` function working
- Context efficiency improvements measurable
- Multi-step workflows functional
- Performance metrics showing token reduction

#### Success Criteria

- Agent uses 70-90% fewer tokens compared to direct tool calling
- Agent can handle complex multi-step workflows
- Search function helps agent find relevant tools quickly
- Response times are acceptable (< 5s for most operations)

---

### Phase 5: Production Readiness (Week 8)

#### Goal

Harden the system for production use with monitoring, testing, and documentation.

#### Tasks

1. **Security Hardening**
   - [ ] Implement rate limiting per session
   - [ ] Add code execution sandboxing audit
   - [ ] Implement token rotation
   - [ ] Add security headers
   - [ ] Create security documentation

2. **Monitoring & Logging**
   - [ ] Add structured logging (JSON format)
   - [ ] Implement metrics collection (token usage, response times, error rates)
   - [ ] Create health check endpoints with detailed status
   - [ ] Add performance monitoring dashboard
   - [ ] Implement alerting for critical errors

3. **Testing**
   - [ ] Create unit tests for all tool modules
   - [ ] Add integration tests for MCP protocol
   - [ ] Implement end-to-end tests with real agents
   - [ ] Add performance/load testing
   - [ ] Create test scenarios for common workflows

4. **Documentation**
   - [ ] Write comprehensive API documentation
   - [ ] Create agent usage examples and patterns
   - [ ] Document security considerations
   - [ ] Add troubleshooting guide
   - [ ] Create video walkthrough of key features

5. **Deployment**
   - [ ] Update Docker configuration
   - [ ] Add docker-compose integration
   - [ ] Create environment variable documentation
   - [ ] Add deployment scripts
   - [ ] Create rollback procedures

#### Deliverables

- Production-ready MCP server
- Comprehensive test suite (>80% coverage)
- Complete documentation
- Monitoring and alerting in place
- Deployment automation

#### Success Criteria

- All tests passing
- Documentation complete and clear
- Security audit passed
- Performance benchmarks met
- Successfully deployed to staging environment

---

## Technical Specifications

### 1. Authentication Flow

```javascript
// Agent's perspective:
import * as auth from "./tools/auth";
import * as sales from "./tools/sales";

// Step 1: Login and get JWT (stored in session automatically)
const loginResult = await auth.login({
  email: "user@example.com",
  password: "password123",
});
console.log(`Logged in as ${loginResult.role}`);

// Step 2: Use authenticated tools (JWT injected automatically)
const todaySales = await sales.getSales({
  startDate: "2024-01-01",
  endDate: "2024-01-31",
});

console.log(`Found ${todaySales.length} sales`);
```

### 2. Tool Definition Format

Each tool is a JavaScript module with clear JSDoc comments:

```javascript
// tools/sales/getSales.js
import { callAPI } from "../../lib/api-client.js";

/**
 * Retrieve sales records with optional filtering
 *
 * @param {Object} params - Query parameters
 * @param {string} [params.startDate] - ISO date string (YYYY-MM-DD)
 * @param {string} [params.endDate] - ISO date string (YYYY-MM-DD)
 * @param {string} [params.customerId] - Filter by customer ID
 * @param {string} [params.sellerId] - Filter by seller ID
 * @param {string} [params.settlementStatus] - 'settled' | 'pending'
 * @param {number} [params.page=1] - Page number for pagination
 * @param {number} [params.limit=50] - Items per page (max 100)
 * @param {string} [params.sortBy='saleDate'] - Sort field
 * @param {string} [params.sortOrder='desc'] - 'asc' | 'desc'
 *
 * @returns {Promise<{sales: Array, pagination: Object}>}
 *
 * @example
 * // Get today's unsettled sales
 * const result = await getSales({
 *   startDate: '2024-01-15',
 *   endDate: '2024-01-15',
 *   settlementStatus: 'pending'
 * });
 */
export async function getSales(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return callAPI("GET", `/bitetrack/sales?${queryString}`);
}
```

### 3. API Client with JWT Injection

```javascript
// lib/api-client.js
import axios from "axios";
import { getSessionToken } from "./session-manager.js";

const API_BASE_URL = process.env.API_URL || "http://localhost:3000";

export async function callAPI(method, path, data = null) {
  const token = getSessionToken();

  const config = {
    method,
    url: `${API_BASE_URL}${path}`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...(data && { data }),
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    // Enhanced error handling
    if (error.response) {
      throw new Error(
        `API Error ${error.response.status}: ${error.response.data.message || error.message}`,
      );
    }
    throw error;
  }
}
```

### 4. Code Execution Sandbox

```javascript
// lib/code-executor.js
import { VM } from "vm2";
import * as apiClient from "./api-client.js";

export async function executeCode(code, sessionId) {
  const vm = new VM({
    timeout: 10000, // 10 second timeout
    sandbox: {
      console: createConsoleCapturer(),
      require: createSafeRequire(sessionId),
      // Inject utilities
      apiClient,
    },
  });

  const output = [];

  try {
    const result = await vm.run(code);
    return { success: true, result, output };
  } catch (error) {
    return { success: false, error: error.message, output };
  }
}

function createSafeRequire(sessionId) {
  // Only allow importing from tools directory
  return (modulePath) => {
    if (!modulePath.startsWith("./tools/")) {
      throw new Error("Can only import from tools directory");
    }
    // Load from virtual filesystem
    return loadToolModule(modulePath, sessionId);
  };
}
```

### 5. MCP SSE Endpoint

```javascript
// routes/mcp.js
app.get("/sse", async (req, res) => {
  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sessionId = generateSessionId();

  // Send initial connection success
  res.write(`data: ${JSON.stringify({ type: "connection", sessionId })}\n\n`);

  // Handle MCP protocol messages
  req.on("data", async (chunk) => {
    const message = JSON.parse(chunk.toString());

    switch (message.type) {
      case "initialize":
        res.write(
          `data: ${JSON.stringify({
            type: "initialized",
            capabilities: {
              tools: true,
              codeExecution: true,
              fileSystem: true,
            },
          })}\n\n`,
        );
        break;

      case "tools/list":
        const tools = await listTools(message.params.path || "/");
        res.write(`data: ${JSON.stringify({ type: "tools", tools })}\n\n`);
        break;

      case "tools/execute":
        const result = await executeCode(message.params.code, sessionId);
        res.write(`data: ${JSON.stringify({ type: "result", result })}\n\n`);
        break;
    }
  });
});
```

## Token Efficiency Comparison

### Traditional Direct Tool Calling

```
Context Window Usage:
- Tool definitions: ~150,000 tokens (all tools loaded upfront)
- Query: 100 tokens
- Intermediate results: 50,000 tokens (full transcript)
- Final response: 1,000 tokens
TOTAL: ~201,000 tokens
```

### Agentic Code Execution (Our Approach)

```
Context Window Usage:
- Tool discovery: 500 tokens (list directories)
- Load needed tools: 1,000 tokens (only 2-3 tool definitions)
- Code execution: 200 tokens
- Filtered output: 300 tokens (only relevant data)
TOTAL: ~2,000 tokens (99% reduction!)
```

## Security Considerations

### 1. Code Execution Safety

- Use `vm2` or `isolated-vm` for sandboxing
- Set strict memory limits (256MB)
- Set execution timeouts (10 seconds)
- Whitelist allowed imports (only tools/)
- No access to filesystem, network (except via API client)

### 2. JWT Token Security

- Store tokens encrypted in session store
- Implement token refresh before expiration
- Clear tokens on session end
- Never log tokens in plaintext
- Use HTTPS in production

### 3. Rate Limiting

- Per-session rate limits (100 req/15min)
- Code execution limits (10/minute)
- API call limits (inherited from BiteTrack API)

### 4. Input Validation

- Sanitize all tool parameters
- Validate code syntax before execution
- Check for malicious patterns
- Enforce parameter types and ranges

## Monitoring & Metrics

### Key Metrics to Track

1. **Token Efficiency**
   - Average tokens per query
   - Token savings vs. direct tool calling
   - Context window utilization

2. **Performance**
   - Response time (p50, p95, p99)
   - Code execution time
   - API call latency
   - Tools loaded per query

3. **Usage**
   - Queries per session
   - Most used tools
   - Success/error rates
   - Common workflows

4. **Security**
   - Failed authentication attempts
   - Rate limit violations
   - Execution timeouts
   - Suspicious code patterns

## Testing Strategy

### 1. Unit Tests

- Each tool module tested independently
- API client error handling
- Session management
- Code executor sandbox

### 2. Integration Tests

- MCP protocol compliance
- Authentication flow end-to-end
- Tool discovery and loading
- Code execution with API calls

### 3. E2E Tests

- Real agent scenarios:
  - "Show me today's sales"
  - "Find top 5 products this month"
  - "Settle all sales for customer X"
  - "Generate sales report for Q1"

### 4. Performance Tests

- Concurrent sessions (10, 50, 100)
- Large dataset handling
- Token usage benchmarks
- API rate limit handling

## Deployment Configuration

### Environment Variables

```bash
# MCP Server
MCP_PORT=3001
NODE_ENV=production

# BiteTrack API
API_URL=http://bitetrack-api:3000
JWT_SECRET=<same-as-api>

# Code Execution
CODE_TIMEOUT_MS=10000
CODE_MEMORY_LIMIT_MB=256
CODE_EXECUTION_RATE_LIMIT=10

# Session Management
SESSION_TIMEOUT_MINUTES=30
SESSION_CLEANUP_INTERVAL_MINUTES=5

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
```

### Docker Compose Integration

```yaml
services:
  mcp-server:
    build: ./services/mcp
    ports:
      - "3001:3001"
    environment:
      - API_URL=http://bitetrack-api:3000
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - bitetrack-api
    networks:
      - bitetrack-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp.rule=Host(`yourdomain.com`) && PathPrefix(`/mcp`)"
```

## Success Metrics (Overall Project)

### Technical Goals

- ✅ 90%+ token reduction vs. direct tool calling
- ✅ < 5s response time for most queries
- ✅ 99.9% uptime
- ✅ > 80% test coverage
- ✅ Zero security vulnerabilities

### User Experience Goals

- ✅ Agents can complete common tasks in 1-3 interactions
- ✅ Natural language queries work intuitively
- ✅ Error messages are clear and actionable
- ✅ Documentation enables self-service

### Business Goals

- ✅ Reduced operational costs (fewer tokens = lower API costs)
- ✅ Faster data access and reporting
- ✅ Improved user satisfaction with AI interactions
- ✅ Foundation for future AI-powered features

## Future Enhancements (Post-v1)

1. **Advanced Analytics Agent**
   - Predictive analytics for inventory
   - Customer behavior insights
   - Sales forecasting

2. **Conversational Memory**
   - Remember previous interactions
   - Build context over time
   - Personalized recommendations

3. **Multi-Modal Support**
   - Generate charts and graphs
   - Parse uploaded documents
   - Image recognition for products

4. **Workflow Automation**
   - Schedule recurring reports
   - Automated alerts and notifications
   - Custom workflow designer

5. **Collaborative Features**
   - Multi-user sessions
   - Shared analysis workspaces
   - Team dashboards

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Anthropic: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [BiteTrack API Documentation](../api/docs/API-documentation.md)
- [BiteTrack OpenAPI Spec](../api/docs/openapi.yaml)

## Contributing

This is a living document. As we implement phases, we'll update with:

- Lessons learned
- Performance data
- Architecture refinements
- New use cases discovered

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-13  
**Status**: Planning Phase  
**Owner**: fcortesbio
