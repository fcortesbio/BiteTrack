# 🤖 BiteTrack MCP Server

AI-powered conversational interface for BiteTrack operations using Model Context Protocol (MCP) and Google Gemini.

## 🎯 Purpose

Provide natural language access to all BiteTrack API operations, enabling:
- Conversational sales processing ("Create a sale for John with 2 coffees")
- Inventory queries ("Do we have enough milk?")
- Business analytics ("Show me this week's top products")
- Customer management via chat interface

## 🚀 Quick Start

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

## 📡 API Endpoints

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

## 🏗️ Implementation Roadmap

### Phase 1: Boilerplate (✅ Complete)
- [x] Basic Express server
- [x] Health check endpoint
- [x] Docker containerization
- [x] Traefik integration

### Phase 2: MCP Integration (Planned)
- [ ] Google Gemini API integration
- [ ] MCP protocol implementation
- [ ] Tool definitions for BiteTrack API
- [ ] Conversation context management

### Phase 3: BiteTrack Integration (Planned)
- [ ] JWT authentication forwarding
- [ ] API client for BiteTrack endpoints
- [ ] Role-based access control
- [ ] Error handling and retry logic

### Phase 4: Advanced Features (Planned)
- [ ] Multi-turn conversations
- [ ] Conversation history storage
- [ ] Predictive analytics
- [ ] Recommendations engine

## 🔧 Environment Variables

```bash
MCP_PORT=3001
NODE_ENV=production
API_URL=http://bitetrack-api:3000
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=same_as_api
```

## 🧪 Testing

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

## 📚 Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [BiteTrack API Documentation](../api/README.md)

## 🔗 Related Services

- **API**: `services/api/` - BiteTrack REST API
- **Frontend**: `services/frontend/` - Web interface
- **Infrastructure**: `infrastructure/` - Docker orchestration
