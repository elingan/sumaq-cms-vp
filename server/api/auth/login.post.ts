import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

const LoginSchema = z.object({
  email: z.string().email(),
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

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  const valid = await verifyUserPassword(password, user.password)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
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
