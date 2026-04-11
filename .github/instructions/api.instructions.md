---
applyTo: 'server/api/**/*.ts'
---

# API Route Conventions for Sumaq CMS

## File Naming Pattern

Use HTTP method suffix:

- `index.get.ts` - GET list
- `index.post.ts` - POST create
- `[id].get.ts` - GET single
- `[id].patch.ts` - PATCH update
- `[id].delete.ts` - DELETE

## Required Pattern

Every API route MUST follow this structure:

```typescript
import { z } from 'zod'
import { createAuditLog } from '~/server/utils/audit'

// Define Zod schema at top
const CreateSchema = z.object({
  name: z.string().min(1),
  // ... fields
})

// Export default event handler
export default defineEventHandler(async (event) => {

  // Implement handlers separately
  // ...
  // Validate body
  const body = await readBody(event)
  const data = CreateSchema.parse(body)

  // Require authenticated session
  const session = await requireUserSession(event)

  // Check permissions
  if (session.user.role !== 'admin' && session.user.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Database operation
  const db = useDrizzle()
  const result = await db.insert(...).values(data).returning()

  // Audit log
  await createAuditLog(session.user.id, 'create', {
    table: 'users',
    id: result[0].id
  }, event)

  return result[0]
}
```

## Error Codes

| Code | When to Use                      |
| ---- | -------------------------------- |
| 400  | Invalid request body or params   |
| 401  | Not authenticated                |
| 403  | Authenticated but not authorized |
| 404  | Resource not found               |
| 409  | Conflict (duplicate, etc.)       |
| 500  | Server error                     |

## Session Handling

```typescript
// Always call at start of handler
const session = await requireUserSession(event)

// Access user
const userId = session.user.id
const userRole = session.user.role
```

## Response Format

```typescript
// Success
return { data: result, meta: { total: 100 } }

// Error
throw createError({
  statusCode: 404,
  statusMessage: 'Not Found',
  data: { message: 'Site not found' },
})
```

## Query Parameters

Always validate and parse query params:

```typescript
const { page = '1', limit = '20', search } = getQuery(event)

const pageNum = parseInt(page as string, 10)
const limitNum = Math.min(parseInt(limit as string, 10), 100)
```

## No Console Logs in Production

- Use `console.error` for errors in development only
- Use proper logging utility for production
- Never log sensitive data (passwords, tokens, etc.)
