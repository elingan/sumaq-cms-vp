import { requireAdminRole } from '#server/utils/auth'

/**
 * @deprecated Password reset is now managed by Clerk via invitations
 * Users are invited via POST /api/admin/users which returns invitation.url
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  throw createError({
    statusCode: 410, // Gone
    message:
      'Password reset links are now managed via Clerk invitations. Use POST /api/admin/users to invite users.',
  })
})
