import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { BookingMemberRoleValues, BookingMemberStatus, userMembers } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { requireAdminRole } from '#server/utils/auth'

const UpdateMemberRoleSchema = z.object({
  role: z.enum(BookingMemberRoleValues),
})

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const memberRowId = getRouterParam(event, 'memberRowId')

  if (!memberRowId) {
    throw createError({ statusCode: 400, message: 'Member ID is required' })
  }

  const body = await readBody(event)
  const result = UpdateMemberRoleSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()

  const [membership] = await db
    .select({
      id: userMembers.id,
      role: userMembers.role,
      status: userMembers.status,
    })
    .from(userMembers)
    .where(eq(userMembers.id, memberRowId))
    .limit(1)

  if (!membership) {
    throw createError({ statusCode: 404, message: 'Member not found' })
  }

  if (membership.status === BookingMemberStatus.Revoked) {
    throw createError({ statusCode: 409, message: 'Revoked members cannot be updated' })
  }

  const [updated] = await db
    .update(userMembers)
    .set({
      role: result.data.role,
      updatedAt: new Date(),
    })
    .where(eq(userMembers.id, memberRowId))
    .returning()

  await createAuditLog(
    userId,
    'update_booking_member_role',
    {
      targetType: 'booking_member',
      targetId: memberRowId,
      oldRole: membership.role,
      newRole: result.data.role,
    },
    event,
  )

  return updated
})
