import { z } from 'zod'
import { findValidPasswordLink } from '#server/utils/password-links'

const ResetPasswordQuerySchema = z.object({
  token: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const result = ResetPasswordQuerySchema.safeParse(query)

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid reset token' })
  }

  const db = useDrizzle()
  const passwordLink = await findValidPasswordLink(db, result.data.token)

  if (!passwordLink) {
    throw createError({ statusCode: 400, message: 'Invalid or expired reset token' })
  }

  return {
    valid: true,
    purpose: passwordLink.purpose,
    expiresAt: passwordLink.expiresAt,
  }
})
