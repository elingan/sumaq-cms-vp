import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { passwordResets, users } from '#server/db/schema'
import { findValidPasswordLink, invalidatePasswordLinks } from '#server/utils/password-links'

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = ResetPasswordSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid password reset request',
    })
  }

  const db = useDrizzle()

  const passwordLink = await db.transaction(async (tx: any) => {
    const activeLink = await findValidPasswordLink(tx, result.data.token)

    if (!activeLink) {
      throw createError({ statusCode: 400, message: 'Invalid or expired reset token' })
    }

    const consumed = await tx
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResets.id, activeLink.id), isNull(passwordResets.usedAt)))
      .returning({ userId: passwordResets.userId, purpose: passwordResets.purpose })

    if (!consumed[0]) {
      throw createError({ statusCode: 400, message: 'Invalid or expired reset token' })
    }

    await tx
      .update(users)
      .set({
        password: await hashPassword(result.data.password),
        updatedAt: new Date(),
      })
      .where(eq(users.id, activeLink.userId))

    await invalidatePasswordLinks(tx, activeLink.userId)

    return consumed[0]
  })

  return {
    ok: true,
    purpose: passwordLink.purpose,
  }
})
