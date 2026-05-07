import { eq } from 'drizzle-orm'
import { teams } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_teams')

  const { teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  const db = useDrizzle()
  const [deleted] = await db.delete(teams).where(eq(teams.id, teamId)).returning({ id: teams.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Team not found' })
  }

  await createAuditLog(userId, 'delete', { table: 'teams', id: teamId }, event)

  return { success: true }
})
