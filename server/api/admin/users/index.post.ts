import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['admin', 'partner', 'owner', 'editor']).default('editor'),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = await readBody(event)
  const result = CreateUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, result.data.email.toLowerCase()))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, message: 'Email already in use' })
  }

  const hashed = await hashUserPassword(result.data.password)

  const [user] = await db
    .insert(users)
    .values({
      email: result.data.email.toLowerCase(),
      password: hashed,
      name: result.data.name,
      role: result.data.role,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })

  await createAuditLog(
    session.user.id,
    'create_user',
    { targetType: 'user', targetId: user!.id },
    event,
  )

  return user
})
