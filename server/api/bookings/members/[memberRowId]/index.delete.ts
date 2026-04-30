import { eq } from 'drizzle-orm'
import { BookingMemberStatus, userMembers } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_bookings')

  const memberRowId = getRouterParam(event, 'memberRowId')

  if (!memberRowId) {
    throw createError({ statusCode: 400, message: 'Member ID is required' })
  }

  const db = useDrizzle()

  const [membership] = await db
    .select({
      id: userMembers.id,
      invitedEmail: userMembers.invitedEmail,
      status: userMembers.status,
      role: userMembers.role,
    })
    .from(userMembers)
    .where(eq(userMembers.id, memberRowId))
    .limit(1)

  if (!membership) {
    throw createError({ statusCode: 404, message: 'Member not found' })
  }

  const [updated] = await db
    .update(userMembers)
    .set({
      status: BookingMemberStatus.Revoked,
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userMembers.id, memberRowId))
    .returning()

  await createAuditLog(
    userId,
    'revoke_booking_member',
    {
      targetType: 'booking_member',
      targetId: memberRowId,
      invitedEmail: membership.invitedEmail,
      previousStatus: membership.status,
      role: membership.role,
    },
    event,
  )

  return updated
})
