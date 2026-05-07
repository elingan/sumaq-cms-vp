import { and, eq } from 'drizzle-orm'
import { teamMembers } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_teams')

  const { teamId, memberId } = getRouterParams(event)
  if (!teamId || !memberId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  const db = useDrizzle()
  const [deleted] = await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)))
    .returning({ id: teamMembers.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Team member not found' })
  }

  await createAuditLog(userId, 'delete', { table: 'team_members', id: memberId, teamId }, event)

  return { success: true }
})
