# @bitetrack/shared-types

Shared constants, types, and validation schemas used across all BiteTrack services.

## Purpose

This package eliminates duplication and ensures consistency between:

- **API** (backend validation and business logic)
- **Frontend** (UI components and form validation)
- **MCP Server** (AI tool definitions and schemas)

## Usage

```javascript
// In any service (API, frontend, MCP)
import { USER_ROLES, PAYMENT_STATUS } from "@bitetrack/shared-types";

if (user.role === USER_ROLES.ADMIN) {
  // Admin-specific logic
}
```

## What to Put Here

✅ **Good candidates:**

- Constants (user roles, status enums, categories)
- API endpoint paths
- Validation schemas (when using Zod/Joi)
- TypeScript interfaces (for frontend)
- Error codes and messages

❌ **Don't put here:**

- Database models (Mongoose schemas stay in API)
- Business logic (keep in services)
- Environment-specific configs

## Future Additions

- TypeScript types for API responses
- Zod schemas for validation
- API endpoint constants
- Shared utility functions
