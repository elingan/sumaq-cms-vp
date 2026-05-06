import { clerkClient } from '@clerk/nuxt/server'
import { UserRole, type UserRoleValue } from '#shared/types/roles'
import type { H3Event } from 'h3'

type Clerk = ReturnType<typeof clerkClient>
type ClerkUser = Awaited<ReturnType<Clerk['users']['getUser']>>
type ClerkUserList = Awaited<ReturnType<Clerk['users']['getUserList']>>
type UpdateUserParams = Parameters<Clerk['users']['updateUser']>[1]

/**
 * Validate user role against allowed enum values
 */
export function isValidUserRole(role: unknown): role is UserRoleValue {
  return typeof role === 'string' && (Object.values(UserRole) as string[]).includes(role)
}

/**
 * List all users from Clerk and augment with local data
 */
export async function listAllUsers(event: H3Event) {
  const clerk = clerkClient(event)

  // Get all users from Clerk (paginate if needed)
  const clerkUsers: ClerkUserList = await clerk.users.getUserList({ limit: 500 })

  // Map to our format
  return clerkUsers.data.map((clerkUser) => ({
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
    role: clerkUser.publicMetadata?.role as string | undefined,
    createdAt: clerkUser.createdAt,
    updatedAt: clerkUser.updatedAt,
    locked: clerkUser.locked,
    lastSignInAt: clerkUser.lastSignInAt,
  }))
}

/**
 * Create a user in Clerk with invite
 */
export async function createClerkUserWithInvite(
  event: H3Event,
  email: string,
  options: {
    firstName?: string
    lastName?: string
    role?: string
    redirectUrl?: string
  } = {},
) {
  const clerk: Clerk = clerkClient(event)

  // Validate role if provided
  const roleToUse = options.role || UserRole.User
  if (!isValidUserRole(roleToUse)) {
    throw createError({
      statusCode: 400,
      message: `Invalid role: ${roleToUse}. Must be one of: ${Object.values(UserRole).join(', ')}`,
    })
  }

  try {
    // Create user in Clerk
    const newUser: ClerkUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName: options.firstName,
      lastName: options.lastName,
      publicMetadata: {
        role: roleToUse,
      },
    })

    // Create invitation for password setup
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role: roleToUse,
      },
      redirectUrl: options.redirectUrl,
    })

    return {
      clerkUser: newUser,
      invitation,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('already exists')) {
      throw createError({
        statusCode: 409,
        message: 'Email already exists in Clerk',
      })
    }
    throw createError({
      statusCode: 500,
      message: `Failed to create user: ${message}`,
    })
  }
}

/**
 * Update user metadata (role) in Clerk
 */
export async function updateClerkUserMetadata(
  event: H3Event,
  userId: string,
  options: {
    firstName?: string
    lastName?: string
    role?: string
  } = {},
) {
  const clerk: Clerk = clerkClient(event)

  // Validate role if provided
  if (options.role && !isValidUserRole(options.role)) {
    throw createError({
      statusCode: 400,
      message: `Invalid role: ${String(options.role)}. Must be one of: ${Object.values(UserRole).join(', ')}`,
    })
  }

  try {
    const updates: UpdateUserParams = {}

    if (options.firstName) updates.firstName = options.firstName
    if (options.lastName) updates.lastName = options.lastName

    // Always update metadata if role is provided
    if (options.role !== undefined) {
      updates.publicMetadata = {
        role: options.role,
      }
    }

    const updated = await clerk.users.updateUser(userId, updates)

    return {
      id: updated.id,
      email: updated.emailAddresses[0]?.emailAddress,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.publicMetadata?.role as string | undefined,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      message: `Failed to update user: ${message}`,
    })
  }
}

/**
 * Delete user from Clerk
 * Note: Local user record will remain for audit trail (webhook won't delete)
 */
export async function deleteClerkUser(event: H3Event, userId: string) {
  const clerk: Clerk = clerkClient(event)

  try {
    await clerk.users.deleteUser(userId)

    // User record remains in local DB for audit purposes
    // Webhook will log the deletion when it arrives

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      message: `Failed to delete user: ${message}`,
    })
  }
}

/**
 * Get user by ID from Clerk
 */
export async function getClerkUserById(event: H3Event, userId: string) {
  const clerk: Clerk = clerkClient(event)

  try {
    const clerkUser = await clerk.users.getUser(userId)

    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
      role: clerkUser.publicMetadata?.role as string | undefined,
      createdAt: clerkUser.createdAt,
      updatedAt: clerkUser.updatedAt,
      locked: clerkUser.locked,
      lastSignInAt: clerkUser.lastSignInAt,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('not found')) {
      throw createError({
        statusCode: 404,
        message: 'User not found',
      })
    }
    throw createError({
      statusCode: 500,
      message: `Failed to fetch user: ${message}`,
    })
  }
}
