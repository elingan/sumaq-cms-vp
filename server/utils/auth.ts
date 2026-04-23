import { clerkClient } from '@clerk/nuxt/server'

/**
 * Get authenticated user from Clerk context.
 * Replaces deprecated requireUserSession() from nuxt-auth-utils.
 * @throws Error with 401 if not authenticated
 */
export async function getClerkUser(event: any) {
  const { userId } = event.context.auth?.() ?? {}

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  return { userId }
}

/**
 * Get authenticated user with full Clerk user data.
 * Useful for accessing email, name, metadata, etc.
 */
export async function getClerkUserWithData(event: any) {
  const { userId } = event.context.auth?.() ?? {}

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const clerkUser = await clerkClient(event).users.getUser(userId)

  return {
    userId,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
    role: clerkUser.publicMetadata?.role as string | undefined,
  }
}

/**
 * Get user role from Clerk public metadata.
 * Used for role-based authorization checks.
 */
export async function getUserRole(event: any): Promise<string | undefined> {
  const { userId } = event.context.auth?.() ?? {}

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const clerkUser = await clerkClient(event).users.getUser(userId)
  return clerkUser.publicMetadata?.role as string | undefined
}

/**
 * Require admin role for protected endpoints.
 * @throws Error with 403 if user is not admin
 */
export async function requireAdminRole(event: any) {
  const role = await getUserRole(event)

  if (role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden: Admin access required' })
  }

  const { userId } = event.context.auth?.() ?? {}
  return { userId, role }
}

/**
 * Require specific role(s) for protected endpoints.
 */
export async function requireRole(event: any, requiredRoles: string | string[]) {
  const role = await getUserRole(event)
  const roleList = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  if (!role || !roleList.includes(role)) {
    throw createError({
      statusCode: 403,
      message: `Forbidden: Required role(s) ${roleList.join(', ')} not found`,
    })
  }

  const { userId } = event.context.auth?.() ?? {}
  return { userId, role }
}

/**
 * Backwards compatibility wrapper - maps getClerkUser to the old session pattern.
 * Returns object with userId and role for easy migration.
 * @deprecated Use getClerkUserWithData or getClerkUser instead
 */
export async function requireUserSession(event: any) {
  const { userId } = await getClerkUser(event)
  const role = await getUserRole(event)

  // Return in session-like format for easier migration
  return {
    user: {
      id: userId,
      role: role || 'editor',
    },
  }
}
