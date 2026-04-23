import { z } from 'zod'
import { siteUsers } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { createAuditLog } from '#server/utils/audit'
import { and, eq } from 'drizzle-orm'

const RemoveOwnerSchema = z.object({
  userId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdminRole(event)

  const siteId = getRouterParam(event, 'id')
  if (!siteId) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  const body = await readBody(event)
  const result = RemoveOwnerSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()

  // Get the membership before deleting
  const [membership] = await db
    .select()
    .from(siteUsers)
    .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, result.data.userId)))
    .limit(1)

  if (!membership) {
    throw createError({
      statusCode: 404,
      message: 'User is not a member of this site',
    })
  }

  // Remove user from site
  await db
    .delete(siteUsers)
    .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, result.data.userId)))

  await createAuditLog(
    adminId,
    'remove_site_member',
    {
      targetType: 'site_membership',
      targetId: `${siteId}:${result.data.userId}`,
      siteId,
      userId: result.data.userId,
      role: membership.role,
    },
    event,
  )

  return { success: true, removedUser: result.data.userId }
})
