import { eq } from 'drizzle-orm'
import { teams, teamMembers, users } from '#server/db/schema'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'

type TeamMemberUser = {
  id: string
  email: string
  name: string | null
  role: string | null
}

type TeamMemberRecord = {
  id: string
  userId: string
  user: TeamMemberUser
}

type TeamWithMembers = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  members: TeamMemberRecord[]
}

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_teams')

  const { add } = getQuery(event)
  const db = useDrizzle()

  if (add === 'members') {
    const rows = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        teamCreatedAt: teams.createdAt,
        teamUpdatedAt: teams.updatedAt,
        memberId: teamMembers.id,
        memberUserId: teamMembers.userId,
        userId: users.id,
        userEmail: users.email,
        userName: users.name,
        userRole: users.role,
      })
      .from(teams)
      .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .leftJoin(users, eq(users.id, teamMembers.userId))
      .orderBy(teams.name)

    const map = new Map<string, TeamWithMembers>()

    for (const row of rows) {
      if (!map.has(row.teamId)) {
        map.set(row.teamId, {
          id: row.teamId,
          name: row.teamName,
          createdAt: row.teamCreatedAt,
          updatedAt: row.teamUpdatedAt,
          members: [],
        })
      }

      if (row.memberId && row.memberUserId && row.userId && row.userEmail) {
        map.get(row.teamId)!.members.push({
          id: row.memberId,
          userId: row.memberUserId,
          user: {
            id: row.userId,
            email: row.userEmail,
            name: row.userName,
            role: row.userRole,
          },
        })
      }
    }

    return Array.from(map.values())
  }

  return db.select().from(teams).orderBy(teams.name)
})
