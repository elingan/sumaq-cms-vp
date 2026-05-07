import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { teamMembers, teams, users } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'

const AddMemberSchema = z.object({
  userId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const actorId = await getClerkUser(event)
  await requirePermission(actorId, 'admin', 'manage_teams')

  const { teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  const body = await readBody(event)
  const result = AddMemberSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid body',
    })
  }

  const db = useDrizzle()

  const [team] = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId)).limit(1)
  if (!team) {
    throw createError({ statusCode: 404, message: 'Team not found' })
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, result.data.userId))
    .limit(1)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const [existing] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, result.data.userId)))
    .limit(1)

  if (existing) {
    return {
      id: existing.id,
      teamId,
      userId: user.id,
      user,
    }
  }

  const [member] = await db
    .insert(teamMembers)
    .values({ teamId, userId: result.data.userId })
    .returning()

  await createAuditLog(actorId, 'create', { table: 'team_members', id: member?.id, teamId }, event)

  return {
    id: member!.id,
    teamId,
    userId: user.id,
    user,
  }
})
