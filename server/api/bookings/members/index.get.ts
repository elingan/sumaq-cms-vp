import { eq } from 'drizzle-orm'
import { userMembers, users } from '#server/db/schema'
import { requirePermission } from '#server/utils/permissions'
import { getClerkUser } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)

  // Check permission using centralized evaluator
  await requirePermission(userId, 'admin', 'manage_bookings')

  const db = useDrizzle()

  const rows = await db
    .select({
      id: userMembers.id,
      userId: userMembers.userId,
      memberId: userMembers.memberId,
      invitedEmail: userMembers.invitedEmail,
      role: userMembers.role,
      status: userMembers.status,
      invitationId: userMembers.invitationId,
      acceptedAt: userMembers.acceptedAt,
      revokedAt: userMembers.revokedAt,
      createdAt: userMembers.createdAt,
      updatedAt: userMembers.updatedAt,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(userMembers)
    .leftJoin(users, eq(userMembers.memberId, users.id))

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    memberId: row.memberId,
    invitationId: row.invitationId,
    name: row.memberName,
    email: row.memberEmail ?? row.invitedEmail,
    invitedEmail: row.invitedEmail,
    role: row.role,
    status: row.status,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
})
