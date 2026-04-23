import { clerkClient } from '@clerk/nuxt/server'

/**
 * List all users from Clerk and augment with local data
 */
export async function listAllUsers(event: any) {
  const clerk = clerkClient(event)

  // Get all users from Clerk (paginate if needed)
  const clerkUsers = await clerk.users.getUserList({ limit: 500 })

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
  event: any,
  email: string,
  options: {
    firstName?: string
    lastName?: string
    role?: string
    redirectUrl?: string
  } = {},
) {
  const clerk = clerkClient(event)

  try {
    // Create user in Clerk
    const newUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName: options.firstName,
      lastName: options.lastName,
      publicMetadata: {
        role: options.role || 'owner',
      },
    })

    // Create invitation for password setup
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role: options.role || 'owner',
      },
      redirectUrl: options.redirectUrl,
    })

    return {
      clerkUser: newUser,
      invitation,
    }
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      throw createError({
        statusCode: 409,
        message: 'Email already exists in Clerk',
      })
    }
    throw createError({
      statusCode: 500,
      message: `Failed to create user: ${error.message}`,
    })
  }
}

/**
 * Update user metadata (role) in Clerk
 */
export async function updateClerkUserMetadata(
  event: any,
  userId: string,
  options: {
    firstName?: string
    lastName?: string
    role?: string
  } = {},
) {
  const clerk = clerkClient(event)

  try {
    const updates: any = {}

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
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to update user: ${error.message}`,
    })
  }
}

/**
 * Delete user from Clerk
 * Note: Local user record will remain for audit trail (webhook won't delete)
 */
export async function deleteClerkUser(event: any, userId: string) {
  const clerk = clerkClient(event)

  try {
    await clerk.users.deleteUser(userId)

    // User record remains in local DB for audit purposes
    // Webhook will log the deletion when it arrives

    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to delete user: ${error.message}`,
    })
  }
}

/**
 * Get user by ID from Clerk
 */
export async function getClerkUserById(event: any, userId: string) {
  const clerk = clerkClient(event)

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
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw createError({
        statusCode: 404,
        message: 'User not found',
      })
    }
    throw createError({
      statusCode: 500,
      message: `Failed to fetch user: ${error.message}`,
    })
  }
}
