import { clerkClient } from '@clerk/nuxt/server'
import { eq } from 'drizzle-orm'
import { UserRole, UserRoleValues, users, type UserRoleValue } from '#server/db/schema'
import type { H3Event } from 'h3'

type ClerkUser = Awaited<ReturnType<ReturnType<typeof clerkClient>['users']['getUser']>>

type AuthContext = {
  auth?: () => { userId?: string | null }
  _localUserEnsured?: Set<string>
}

type EventWithAuth = H3Event & { context: H3Event['context'] & AuthContext }

function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.toLowerCase().trim()
  return normalized || null
}

function coerceUserRole(role: unknown): UserRoleValue {
  if (typeof role === 'string' && (UserRoleValues as readonly string[]).includes(role)) {
    return role as UserRoleValue
  }
  return UserRole.User
}

async function ensureLocalUserRecord(event: EventWithAuth, userId: string, clerkUser?: ClerkUser) {
  const ctx = event.context as EventWithAuth['context']
  const ensured: Set<string> = (ctx._localUserEnsured ??= new Set<string>())
  if (ensured.has(userId)) return

  const db = useDrizzle()
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (existing) {
    ensured.add(userId)
    return
  }

  const user = clerkUser ?? (await clerkClient(event).users.getUser(userId))
  const email = normalizeEmail(user.emailAddresses?.[0]?.emailAddress)

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Missing email for authenticated user',
    })
  }

  const role = coerceUserRole(user.publicMetadata?.role)
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email

  try {
    await db.insert(users).values({
      id: userId,
      email,
      name,
      role,
      githubData: null,
    })
  } catch (error) {
    const [existingByEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!existingByEmail) {
      console.error('[Auth] Failed to provision local user record', error)
      throw createError({ statusCode: 500, message: 'Failed to provision local user record' })
    }
  }

  ensured.add(userId)
}

/**
 * Get authenticated user ID from Clerk context.
 * Replaces deprecated requireUserSession() from nuxt-auth-utils.
 * @throws Error with 401 if not authenticated
 * @returns userId string
 */
export async function getClerkUser(event: EventWithAuth): Promise<string> {
  const { userId } = event.context.auth?.() ?? {}

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  await ensureLocalUserRecord(event, userId)
  return userId
}

/**
 * Get authenticated user with full Clerk user data.
 * Useful for accessing email, name, metadata, etc.
 */
export async function getClerkUserWithData(event: EventWithAuth) {
  const { userId } = event.context.auth?.() ?? {}

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const clerkUser = await clerkClient(event).users.getUser(userId)
  await ensureLocalUserRecord(event, userId, clerkUser)

  return {
    userId,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
    role: coerceUserRole(clerkUser.publicMetadata?.role),
  }
}

/**
 * Get user role from Clerk public metadata, with fallback to local database.
 * Used for role-based authorization checks.
 */
export async function getUserRole(event: EventWithAuth): Promise<UserRoleValue> {
  const { userId } = event.context.auth?.() ?? {}

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const clerkUser = await clerkClient(event).users.getUser(userId)
  await ensureLocalUserRecord(event, userId, clerkUser)
  const roleFromClerk = coerceUserRole(clerkUser.publicMetadata?.role)
  if (roleFromClerk) return roleFromClerk

  const db = useDrizzle()
  const [localUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return coerceUserRole(localUser?.role)
}

/**
 * Require admin role for protected endpoints.
 * @throws Error with 403 if user is not admin
 */
export async function requireAdminRole(event: EventWithAuth) {
  const role = await getUserRole(event)

  if (role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden: Admin access required' })
  }

  const { userId } = event.context.auth?.() ?? {}
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return { userId, role }
}

/**
 * Require specific role(s) for protected endpoints.
 */
export async function requireRole(event: EventWithAuth, requiredRoles: string | string[]) {
  const role = await getUserRole(event)
  const roleList = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  if (!role || !roleList.includes(role)) {
    throw createError({
      statusCode: 403,
      message: `Forbidden: Required role(s) ${roleList.join(', ')} not found`,
    })
  }

  const { userId } = event.context.auth?.() ?? {}
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return { userId, role }
}

/**
 * Backwards compatibility wrapper - maps getClerkUser to the old session pattern.
 * Returns object with userId and role for easy migration.
 * @deprecated Use getClerkUserWithData or getClerkUser instead
 */
export async function requireUserSession(event: EventWithAuth) {
  const userId = await getClerkUser(event)
  const role = await getUserRole(event)

  // Return in session-like format for easier migration
  return {
    user: {
      id: userId,
      role,
    },
  }
}
