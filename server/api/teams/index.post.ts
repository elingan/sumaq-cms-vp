import { z } from 'zod'
import { teams } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'

const CreateTeamSchema = z.object({
  name: z.string().min(1).max(255),
})

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_teams')

  const body = await readBody(event)
  const result = CreateTeamSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid body',
    })
  }

  const db = useDrizzle()
  const [team] = await db.insert(teams).values({ name: result.data.name }).returning()

  await createAuditLog(userId, 'create', { table: 'teams', id: team?.id }, event)

  return team
})
