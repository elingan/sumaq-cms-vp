import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { teams } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'

const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(255),
})

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_teams')

  const { teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  const body = await readBody(event)
  const result = UpdateTeamSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid body',
    })
  }

  const db = useDrizzle()
  const [team] = await db
    .update(teams)
    .set({ name: result.data.name, updatedAt: new Date() })
    .where(eq(teams.id, teamId))
    .returning()

  if (!team) {
    throw createError({ statusCode: 404, message: 'Team not found' })
  }

  await createAuditLog(userId, 'update', { table: 'teams', id: teamId }, event)

  return team
})
