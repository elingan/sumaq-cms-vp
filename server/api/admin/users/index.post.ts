import { z } from 'zod'
import { requirePermission } from '#server/utils/permissions'
import { getClerkUser } from '#server/utils/auth'
import { createClerkUserWithInvite } from '#server/utils/clerk-users'
import { createAuditLog } from '#server/utils/audit'

const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'partner', 'owner', 'editor']).default('owner'),
  redirectUrl: z.string().url().optional(),
})

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)

  // Check permission using centralized evaluator
  await requirePermission(userId, 'admin', 'create_user')

  const body = await readBody(event)
  const result = CreateUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  // Create user in Clerk with invitation
  const { clerkUser, invitation } = await createClerkUserWithInvite(event, result.data.email, {
    firstName: result.data.firstName,
    lastName: result.data.lastName,
    role: result.data.role,
    redirectUrl: result.data.redirectUrl,
  })

  await createAuditLog(
    userId,
    'create_user',
    {
      targetType: 'user',
      targetId: clerkUser.id,
      email: result.data.email,
      role: result.data.role,
    },
    event,
  )

  return {
    user: {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      role: clerkUser.publicMetadata?.role,
      createdAt: clerkUser.createdAt,
    },
    invitation: {
      id: invitation.id,
      emailAddress: (invitation as any).emailAddress,
      status: invitation.status,
      expiresAt: (invitation as any).expiresAt,
      url: (invitation as any).url,
    },
  }
})
