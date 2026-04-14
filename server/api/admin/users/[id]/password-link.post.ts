import { eq } from 'drizzle-orm'
import { users } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { issuePasswordLink } from '#server/utils/password-links'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing user id' })
  }

  const db = useDrizzle()

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      password: users.password,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const purpose = user.password ? 'reset' : 'invite'
  const passwordLink = await issuePasswordLink({
    db,
    userId: user.id,
    purpose,
    event,
  })

  console.info(`Password ${purpose} link for ${user.email}: ${passwordLink.link}`)

  await createAuditLog(
    session.user.id,
    'generate_user_password_link',
    { targetType: 'user', targetId: user.id, purpose },
    event,
  )

  return {
    passwordLink: passwordLink.link,
    expiresAt: passwordLink.expiresAt,
    purpose,
  }
})
