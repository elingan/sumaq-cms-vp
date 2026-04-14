import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '#server/db/schema'

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = LoginSchema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid email or password format' })
  }

  const { email, password } = result.data
  const db = useDrizzle()

  if (!db) {
    throw createError({ statusCode: 500, message: 'Database connection failed' })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })

  if (!user) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  if (!user.password) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  const valid = await verifyPassword(user.password, password)

  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  if (passwordNeedsReHash(user.password)) {
    await db
      .update(users)
      .set({
        password: await hashPassword(password),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? '',
      role: user.role,
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
})
