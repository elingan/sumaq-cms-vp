import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '#server/db/schema'
import { issuePasswordLink } from '#server/utils/password-links'

const ForgotPasswordSchema = z.object({
  email: z.email(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = ForgotPasswordSchema.safeParse(body)

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid email address' })
  }

  const db = useDrizzle()
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, result.data.email.toLowerCase()))
    .limit(1)

  if (user) {
    await issuePasswordLink({
      db,
      userId: user.id,
      purpose: 'reset',
      event,
    })
  }

  return {
    ok: true,
  }
})
