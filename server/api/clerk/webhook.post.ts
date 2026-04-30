import { Webhook } from 'svix'
import { and, eq } from 'drizzle-orm'
import { BookingMemberStatus, userMembers, users } from '#server/db/schema'
import { auditUserRoleChange, auditUserDeleted, auditUserSynced } from '#server/utils/audit'
import { UserRole, type UserRoleValue } from '#shared/types/roles'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || ''

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses?: Array<{ email_address: string }>
    first_name?: string
    last_name?: string
    public_metadata?: {
      role?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  if (!webhookSecret) {
    throw createError({ statusCode: 500, message: 'Webhook secret not configured' })
  }

  // Get the raw body for signature verification
  const body = await readRawBody(event)
  if (!body) {
    throw createError({ statusCode: 400, message: 'No body provided' })
  }

  // Get headers for signature verification
  const svix_id = getHeader(event, 'svix-id')
  const svix_timestamp = getHeader(event, 'svix-timestamp')
  const svix_signature = getHeader(event, 'svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw createError({ statusCode: 400, message: 'Missing webhook headers' })
  }

  // Verify webhook signature
  const wh = new Webhook(webhookSecret)
  let clerkEvent: ClerkWebhookEvent
  try {
    clerkEvent = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent
  } catch {
    throw createError({ statusCode: 401, message: 'Webhook signature verification failed' })
  }

  const db = useDrizzle()
  const eventType = clerkEvent.type

  function normalizeEmail(value: string | undefined) {
    return value?.toLowerCase().trim()
  }

  async function activatePendingBookingMemberships(email: string, clerkId: string) {
    await db
      .update(userMembers)
      .set({
        memberId: clerkId,
        status: BookingMemberStatus.Active,
        acceptedAt: new Date(),
        revokedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userMembers.invitedEmail, email),
          eq(userMembers.status, BookingMemberStatus.Pending),
        ),
      )
  }

  // Handle user.created event
  if (eventType === 'user.created') {
    const {
      id: clerk_id,
      email_addresses,
      first_name,
      last_name,
      public_metadata,
    } = clerkEvent.data
    const email = normalizeEmail(email_addresses?.[0]?.email_address)
    const clerkRole = public_metadata?.role as string | undefined

    if (!email) {
      console.warn(`[Clerk Webhook] user.created: No email found for user ${clerk_id}`)
      return { success: true }
    }

    try {
      // Prefer the Clerk user ID as the canonical primary key.
      const [existingById] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, clerk_id))
        .limit(1)

      if (existingById) {
        // User already exists; update with new email/name/role from Clerk
        // User already exists; update with new email/name/role from Clerk
        const roleToSync: UserRoleValue = (clerkRole as UserRoleValue) || existingById.role
        await db
          .update(users)
          .set({
            email,
            name: [first_name, last_name].filter(Boolean).join(' ') || email,
            role: roleToSync,
            updatedAt: new Date(),
          })
          .where(eq(users.id, clerk_id))

        console.info(
          `[Clerk Webhook] user.created: User already exists by Clerk ID ${clerk_id}; synced role ${roleToSync}`,
        )
        await auditUserSynced(clerk_id, email, 'updated', { role: roleToSync })
      } else {
        // Legacy compatibility: if an old local row exists by email, migrate to Clerk ID
        const [existingByEmail] = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (existingByEmail) {
          console.warn(
            `[Clerk Webhook] user.created: Existing local user found by email ${email} with id ${existingByEmail.id}; manual reconciliation required to align with Clerk ID ${clerk_id}`,
          )
        } else {
          // Create new user with role from Clerk or default 'owner'
          const roleToSync: UserRoleValue = (clerkRole as UserRoleValue) || UserRole.Owner
          await db.insert(users).values({
            id: clerk_id,
            email,
            name: [first_name, last_name].filter(Boolean).join(' ') || email,
            role: roleToSync,
            githubData: null,
          })

          console.info(
            `[Clerk Webhook] user.created: Created local user ${clerk_id} for ${email} with role ${roleToSync}`,
          )
          await auditUserSynced(clerk_id, email, 'created', { role: roleToSync })
        }
      }

      await activatePendingBookingMemberships(email, clerk_id)
    } catch (error) {
      console.error(`[Clerk Webhook] user.created: Error creating user ${email}`, error)
      throw createError({
        statusCode: 500,
        message: 'Failed to process user creation',
      })
    }
  }

  // Handle user.updated event
  if (eventType === 'user.updated') {
    const {
      id: clerk_id,
      email_addresses,
      first_name,
      last_name,
      public_metadata,
    } = clerkEvent.data
    const email = normalizeEmail(email_addresses?.[0]?.email_address)
    const clerkRole = public_metadata?.role as string | undefined

    if (!email) {
      console.warn(`[Clerk Webhook] user.updated: No email found for user ${clerk_id}`)
      return { success: true }
    }

    try {
      // Get current user to detect role changes
      const [currentUser] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, clerk_id))
        .limit(1)

      if (currentUser) {
        // Update by Clerk ID
        const roleToSync: UserRoleValue = (clerkRole as UserRoleValue) || currentUser.role
        const updatedUser = await db
          .update(users)
          .set({
            email,
            name: [first_name, last_name].filter(Boolean).join(' ') || email,
            role: roleToSync,
            updatedAt: new Date(),
          })
          .where(eq(users.id, clerk_id))
          .returning({ id: users.id, role: users.role })

        if (updatedUser && updatedUser.length > 0) {
          // Audit role change if it occurred
          if (clerkRole && clerkRole !== currentUser.role) {
            await auditUserRoleChange(clerk_id, currentUser.role, clerkRole, 'clerk_webhook')
          }
          console.info(
            `[Clerk Webhook] user.updated: Updated user by Clerk ID ${clerk_id} (role: ${currentUser.role} -> ${roleToSync})`,
          )
        }
      } else {
        // Fallback for legacy records keyed by email
        const [updatedByEmail] = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (updatedByEmail) {
          const roleToSync: UserRoleValue = (clerkRole as UserRoleValue) || updatedByEmail.role
          await db
            .update(users)
            .set({
              name: [first_name, last_name].filter(Boolean).join(' ') || email,
              role: roleToSync,
              updatedAt: new Date(),
            })
            .where(eq(users.email, email))

          if (clerkRole && clerkRole !== updatedByEmail.role) {
            await auditUserRoleChange(
              updatedByEmail.id,
              updatedByEmail.role,
              clerkRole,
              'clerk_webhook',
            )
          }
          console.warn(
            `[Clerk Webhook] user.updated: Updated legacy user by email ${email}; id ${updatedByEmail.id} should be reconciled with Clerk ID ${clerk_id}`,
          )
        } else {
          // Create missing user
          const roleToSync: UserRoleValue = (clerkRole as UserRoleValue) || UserRole.Owner
          await db.insert(users).values({
            id: clerk_id,
            email,
            name: [first_name, last_name].filter(Boolean).join(' ') || email,
            role: roleToSync,
            githubData: null,
          })

          console.info(`[Clerk Webhook] user.updated: Created missing local user for ${clerk_id}`)
          await auditUserSynced(clerk_id, email, 'created', { role: roleToSync })
        }
      }

      await activatePendingBookingMemberships(email, clerk_id)
    } catch (error) {
      console.error(`[Clerk Webhook] user.updated: Error updating user ${email}`, error)
      // Don't throw error, continue processing
    }
  }

  // Handle user.deleted event
  if (eventType === 'user.deleted') {
    const { id: clerk_id, email_addresses } = clerkEvent.data
    const email = normalizeEmail(email_addresses?.[0]?.email_address)

    try {
      // Instead of deleting, mark user as inactive or simply log the deletion
      // For now, we'll keep the record for audit trail but could add a 'deleted_at' field
      // if schema supports it. For backward compat, we delete but audit it first.

      const [existingUser] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, clerk_id))
        .limit(1)

      if (existingUser) {
        await auditUserDeleted(clerk_id, email || existingUser.email, 'clerk_webhook')
        await db.delete(users).where(eq(users.id, clerk_id))

        console.info(
          `[Clerk Webhook] user.deleted: User ${clerk_id} (${email || 'unknown email'}) deleted and audited`,
        )
      } else {
        console.warn(
          `[Clerk Webhook] user.deleted: User ${clerk_id} not found in local DB for deletion`,
        )
      }
    } catch (error) {
      console.error(`[Clerk Webhook] user.deleted: Error handling user deletion ${clerk_id}`, error)
      // Don't throw error, continue processing
    }
  }

  return { success: true }
})
