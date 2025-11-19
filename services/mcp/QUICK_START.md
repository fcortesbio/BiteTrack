# BiteTrack MCP Quick Start Guide

## What is This?

An MCP (Model Context Protocol) server that lets AI agents like Claude interact with BiteTrack using natural language, while being **99% more token-efficient** than traditional approaches.

## Why Code Execution Instead of Direct Tool Calls?

### Traditional Approach (Bad)

```
Agent needs to:
1. Load ALL 38+ tool definitions → 150,000 tokens
2. See FULL intermediate results → 50,000+ tokens
3. Copy data between calls → Lots of errors

Total: ~200,000 tokens per query 💸💸💸
```

### Our Approach (Good)

```
Agent:
1. Explores tools like files: ls ./tools/sales/ → 500 tokens
2. Loads only what it needs: cat getSales.js → 1,000 tokens
3. Executes code that filters data → 500 tokens

Total: ~2,000 tokens per query ✅
```

**Token Reduction: 99%** 🎉

## How It Works

```javascript
// Agent writes code like this:
import * as auth from "./tools/auth";
import * as sales from "./tools/sales";

// Login (JWT stored automatically)
await auth.login({ email: "user@example.com", password: "pass" });

// Get data (JWT injected automatically)
const data = await sales.getSales({
  startDate: "2024-01-01",
  settlementStatus: "pending",
});

// Filter in code, not in agent context
const topSales = data.sales.filter((s) => s.total > 100).slice(0, 5);

console.log(topSales); // Agent sees only this
```

## Architecture in 30 Seconds

```
Warp/Claude
    ↓ (MCP over SSE)
MCP Server (Port 3001)
    ├─ Code Execution Sandbox (vm2)
    ├─ Virtual Filesystem (tools/)
    ├─ Session Manager (JWT storage)
    └─ API Client (axios)
        ↓ (HTTP with Bearer token)
BiteTrack API (Port 3000)
```

## Key Components

### 1. Virtual Filesystem

```
tools/
├── auth/
│   └── login.js          # Login and get JWT
├── sales/
│   ├── getSales.js       # List sales
│   ├── getSaleById.js    # Get sale details
│   └── settleSale.js     # Mark as paid
├── products/
│   └── getProducts.js    # List inventory
├── customers/
│   └── getCustomers.js   # List customers
└── reporting/
    └── getSalesAnalytics.js # Analytics
```

### 2. Authentication Flow

```javascript
// Step 1: Agent logs in
const { token, role } = await auth.login({ email, password });
// → Token stored in session (encrypted)

// Step 2: All subsequent calls use stored token
const sales = await sales.getSales();
// → API client auto-injects: Authorization: Bearer <token>
```

### 3. Code Execution Sandbox

- **Isolated environment** (vm2): Agent code can't access filesystem, network
- **Time limits**: 10 second timeout
- **Memory limits**: 256MB max
- **Whitelist imports**: Only `./tools/*` allowed

## Implementation Phases

| Phase | Goal                                     | Duration  | Status      |
| ----- | ---------------------------------------- | --------- | ----------- |
| 1     | SSE endpoint + code execution + auth     | Weeks 1-2 | 🔄 Planning |
| 2     | All read operations (GET endpoints)      | Weeks 3-4 | ⏳ Pending  |
| 3     | Sale settlement (write operation)        | Week 5    | ⏳ Pending  |
| 4     | Advanced features (search, optimization) | Weeks 6-7 | ⏳ Pending  |
| 5     | Production ready (tests, monitoring)     | Week 8    | ⏳ Pending  |

## Tech Stack

- **MCP Protocol**: SSE (Server-Sent Events)
- **Code Execution**: vm2 (sandboxed JavaScript)
- **API Client**: axios (with JWT injection)
- **Session Store**: In-memory (Map) with cleanup
- **Server**: Express.js

## Security Features

1. **Code Sandboxing**: No filesystem/network access, only API calls
2. **JWT Management**: Encrypted storage, auto-refresh
3. **Rate Limiting**: 100 req/15min per session
4. **Input Validation**: All tool parameters validated
5. **Audit Logging**: All write operations logged

## Example User Interactions

### Query 1: "Show me today's sales"

```javascript
// Agent discovers tools
const fs = require("fs");
const salesTools = fs.readdirSync("./tools/sales");
// → ['getSales.js', 'getSaleById.js', 'settleSale.js']

// Agent reads tool definition
const getSalesDef = fs.readFileSync("./tools/sales/getSales.js");
// → Full JSDoc with parameters

// Agent writes code
import * as sales from "./tools/sales";
const today = new Date().toISOString().split("T")[0];
const result = await sales.getSales({
  startDate: today,
  endDate: today,
});
console.log(
  `Found ${result.sales.length} sales totaling $${result.totalRevenue}`,
);
```

### Query 2: "Settle all sales for customer John Doe"

```javascript
// Agent finds customer
import * as customers from "./tools/customers";
const john = (
  await customers.getCustomers({
    search: "John Doe",
  })
).customers[0];

// Get unsettled sales
import * as sales from "./tools/sales";
const unsettled = await sales.getSales({
  customerId: john._id,
  settlementStatus: "pending",
});

// Settle each (with confirmation)
console.log(`About to settle ${unsettled.sales.length} sales. Confirm?`);
// → Agent asks user for confirmation

for (const sale of unsettled.sales) {
  await sales.settleSale({ saleId: sale._id });
}
console.log("Done!");
```

## Configuration

### Environment Variables

```bash
# MCP Server
MCP_PORT=3001
NODE_ENV=production

# BiteTrack API Connection
API_URL=http://bitetrack-api:3000
JWT_SECRET=<same-as-bitetrack-api>

# Code Execution Limits
CODE_TIMEOUT_MS=10000
CODE_MEMORY_LIMIT_MB=256

# Session Management
SESSION_TIMEOUT_MINUTES=30
```

### Warp Configuration

```json
{
  "BiteTrack MCP": {
    "url": "http://localhost:3001/sse"
  }
}
```

## Development Workflow

### 1. Start Services

```bash
# Start BiteTrack API (required)
cd services/api
npm run dev

# Start MCP Server
cd services/mcp
npm run dev
```

### 2. Configure Warp

- Open Warp → Settings → AI → MCP Servers
- Add SSE server: `http://localhost:3001/sse`
- Start the server

### 3. Test with Agent

In Warp's AI chat:

```
"Connect to BiteTrack and show me today's sales"
```

## Testing

```bash
# Unit tests
npm test

# Integration tests (requires API running)
npm run test:integration

# E2E tests with mock agent
npm run test:e2e

# Load testing
npm run test:load
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

### Metrics

- Token usage per query
- Response times (p50, p95, p99)
- Error rates
- Most used tools

### Logs

```bash
# View logs
tail -f logs/mcp-server.log

# JSON format for parsing
cat logs/mcp-server.log | jq '.level, .message'
```

## Troubleshooting

### Agent can't authenticate

- Check JWT_SECRET matches API
- Verify API is running on correct port
- Check session storage hasn't expired

### Code execution timeout

- Check API response times
- Increase CODE_TIMEOUT_MS if needed
- Look for infinite loops in agent code

### Tools not found

- Verify virtual filesystem is loaded
- Check tool module exports
- Ensure proper path in imports

## Next Steps

1. **Read the full roadmap**: [MCP_ROADMAP.md](./MCP_ROADMAP.md)
2. **Review architecture**: See detailed diagrams and flows
3. **Start Phase 1**: Implement SSE endpoint and code sandbox
4. **Join discussions**: Share feedback and ideas

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Anthropic's Code Execution Guide](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [BiteTrack API Docs](../api/docs/API-documentation.md)
- [Full Roadmap](./MCP_ROADMAP.md)

---

**Questions?** Open an issue or discussion in the repo!
