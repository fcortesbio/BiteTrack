# BiteTrack MCP Server

AI-powered conversational interface for BiteTrack operations using Model Context Protocol (MCP) and Google Gemini.

## Purpose

Provide natural language access to all BiteTrack API operations, enabling:
- Conversational sales processing ("Create a sale for John with 2 coffees")
- Inventory queries ("Do we have enough milk?")
- Business analytics ("Show me this week's top products")
- Customer management via chat interface

## Quick Start

### Development
```bash
npm install
npm run dev
```

Server runs on `http://localhost:3001`

### Docker
```bash
docker build -t bitetrack-mcp .
docker run -p 3001:3001 bitetrack-mcp
```

### With Full Stack
```bash
cd ../../infrastructure
docker compose up -d
```

Access via Traefik: `http://localhost/mcp/` or `https://yourdomain.com/mcp/`

## API Endpoints

### Health Check
```bash
GET /health
```

### Root Information
```bash
GET /
```

### Chat Interface (Coming Soon)
```bash
POST /chat
Content-Type: application/json

{
  "message": "Show me today's sales",
  "context": {
    "userId": "seller_id",
    "role": "user"
  }
}
```

### Tool Execution (Coming Soon)
```bash
POST /tools/execute
Content-Type: application/json

{
  "tool": "create_sale",
  "parameters": {
    "customerId": "...",
    "products": [...]
  }
}
```

## Implementation Roadmap

**See [MCP_ROADMAP.md](./MCP_ROADMAP.md) for the complete implementation plan.**

The roadmap includes:
- **Phase 1**: Core MCP Infrastructure with agentic code execution (Weeks 1-2)
- **Phase 2**: Core Read Operations for all entities (Weeks 3-4)
- **Phase 3**: Write Operations - Settlement (Week 5)
- **Phase 4**: Advanced Features - Tool search, context optimization (Weeks 6-7)
- **Phase 5**: Production Readiness - Testing, monitoring, deployment (Week 8)

### Key Architecture Decisions

✅ **Agentic Code Execution over Direct Tool Calls**
- Tools exposed as JavaScript modules in virtual filesystem
- Agent loads only needed tool definitions (99% token reduction)
- Intermediate results stay in execution environment

✅ **JWT Authentication Integration**
- Session-based token storage
- Automatic token injection in API calls
- Role-based access control inherited from BiteTrack API

✅ **Progressive Tool Discovery**
- Filesystem-based tool exploration
- On-demand definition loading
- Search function for semantic tool discovery

### Current Status: Phase 1 Foundation
- [x] Basic Express server
- [x] Health check endpoint
- [x] Docker containerization
- [x] Traefik integration
- [ ] SSE MCP endpoint
- [ ] Code execution sandbox
- [ ] Virtual filesystem for tools
- [ ] Session management and JWT storage

## Environment Variables

```bash
MCP_PORT=3001
NODE_ENV=production
API_URL=http://bitetrack-api:3000
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=same_as_api
```

## Testing

```bash
# Health check
curl http://localhost:3001/health

# Root info
curl http://localhost:3001/

# Test chat (placeholder)
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

## Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [BiteTrack API Documentation](../api/README.md)

## Related Services

- **API**: `services/api/` - BiteTrack REST API
- **Frontend**: `services/frontend/` - Web interface
- **Infrastructure**: `infrastructure/` - Docker orchestration
