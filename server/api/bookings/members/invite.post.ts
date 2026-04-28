import { clerkClient } from '@clerk/nuxt/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  BookingMemberRole,
  BookingMemberRoleValues,
  BookingMemberStatus,
  userMembers,
  users,
} from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { requireAdminRole } from '#server/utils/auth'

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(BookingMemberRoleValues).default(BookingMemberRole.Member),
})

function normalizeEmail(email: string) {
  return email.toLowerCase().trim()
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const body = await readBody(event)
  const result = InviteMemberSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()
  const email = normalizeEmail(result.data.email)

  const [existing] = await db
    .select({
      id: userMembers.id,
      status: userMembers.status,
    })
    .from(userMembers)
    .where(eq(userMembers.invitedEmail, email))
    .limit(1)

  const [existingUser] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  const [inviter] = await db
    .select({
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (existing && existing.status !== BookingMemberStatus.Revoked) {
    throw createError({
      statusCode: 409,
      message: 'A member or invitation already exists for this email',
    })
  }

  let invitationId: string | null = null

  if (existingUser) {
    const teamLabel = inviter?.name || inviter?.email || userId
    console.info(
      `[Booking Members] Temporary email sent to ${email}: You were added to ${teamLabel}'s team.`,
    )
  } else {
    try {
      const invitation = await clerkClient(event).invitations.createInvitation({
        emailAddress: email,
        publicMetadata: {
          role: result.data.role,
        },
        redirectUrl: new URL('/booking/calendar', getRequestURL(event)).toString(),
      })

      invitationId = invitation.id
    } catch (error: unknown) {
      let statusCode: number | undefined

      if (typeof error === 'object' && error && 'statusCode' in error) {
        statusCode = Number((error as { statusCode?: number }).statusCode)
      }

      throw createError({
        statusCode: statusCode ?? 500,
        message: 'Failed to send invitation email',
      })
    }
  }

  const values = {
    userId,
    memberId: existingUser?.id ?? null,
    invitedEmail: email,
    invitationId,
    role: result.data.role,
    status: existingUser ? BookingMemberStatus.Active : BookingMemberStatus.Pending,
    invitedBy: userId,
    acceptedAt: existingUser ? new Date() : null,
    revokedAt: null,
    updatedAt: new Date(),
  }

  const [membership] = existing
    ? await db.update(userMembers).set(values).where(eq(userMembers.id, existing.id)).returning()
    : await db.insert(userMembers).values(values).returning()

  if (!membership) {
    throw createError({ statusCode: 500, message: 'Failed to persist invited member' })
  }

  await createAuditLog(
    userId,
    'invite_booking_member',
    {
      targetType: 'booking_member',
      targetId: membership.id,
      invitedEmail: email,
      role: result.data.role,
      invitationId,
      linkedUserId: existingUser?.id ?? null,
    },
    event,
  )

  return membership
})
