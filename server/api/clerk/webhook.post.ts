import { Webhook } from 'svix'
import { eq } from 'drizzle-orm'
import { users } from '#server/db/schema'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || ''

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses?: Array<{ email_address: string }>
    first_name?: string
    last_name?: string
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

  // Handle user.created event
  if (eventType === 'user.created') {
    const { id: clerk_id, email_addresses, first_name, last_name } = clerkEvent.data
    const email = normalizeEmail(email_addresses?.[0]?.email_address)

    if (!email) {
      console.warn(`[Clerk Webhook] user.created: No email found for user ${clerk_id}`)
      return { success: true }
    }

    try {
      // Prefer the Clerk user ID as the canonical primary key.
      const [existingById] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, clerk_id))
        .limit(1)

      if (existingById) {
        await db
          .update(users)
          .set({
            email,
            name: [first_name, last_name].filter(Boolean).join(' ') || email,
            updatedAt: new Date(),
          })
          .where(eq(users.id, clerk_id))

        console.info(`[Clerk Webhook] user.created: User already exists by Clerk ID ${clerk_id}`)
      } else {
        // Legacy compatibility: if an old local row exists by email, keep it and avoid
        // creating a duplicate conflicting record. Access checks rely on Clerk IDs.
        const [existingByEmail] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (existingByEmail) {
          console.warn(
            `[Clerk Webhook] user.created: Existing local user found by email ${email} with id ${existingByEmail.id}; manual reconciliation required to align with Clerk ID ${clerk_id}`,
          )
        } else {
          // Create new user with default role 'owner'.
          // User ID must match Clerk user ID for permission checks to remain consistent.
          await db.insert(users).values({
            id: clerk_id,
            email,
            name: [first_name, last_name].filter(Boolean).join(' ') || email,
            role: 'owner',
            githubData: null,
          })

          console.info(
            `[Clerk Webhook] user.created: Created local user ${clerk_id} for ${email} with role 'owner'`,
          )
        }
      }
    } catch {
      console.error(`[Clerk Webhook] user.created: Error creating user ${email}`)
      throw createError({
        statusCode: 500,
        message: 'Failed to process user creation',
      })
    }
  }

  // Handle user.updated event
  if (eventType === 'user.updated') {
    const { id: clerk_id, email_addresses, first_name, last_name } = clerkEvent.data
    const email = normalizeEmail(email_addresses?.[0]?.email_address)

    if (!email) {
      console.warn(`[Clerk Webhook] user.updated: No email found for user ${clerk_id}`)
      return { success: true }
    }

    try {
      // Update by Clerk ID first.
      const [updatedById] = await db
        .update(users)
        .set({
          email,
          name: [first_name, last_name].filter(Boolean).join(' ') || email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, clerk_id))
        .returning({ id: users.id })

      if (updatedById) {
        console.info(`[Clerk Webhook] user.updated: Updated user by Clerk ID ${clerk_id}`)
      } else {
        // Fallback for legacy records keyed by email.
        const [updatedByEmail] = await db
          .update(users)
          .set({
            name: [first_name, last_name].filter(Boolean).join(' ') || email,
            updatedAt: new Date(),
          })
          .where(eq(users.email, email))
          .returning({ id: users.id })

        if (updatedByEmail) {
          console.warn(
            `[Clerk Webhook] user.updated: Updated legacy user by email ${email}; id ${updatedByEmail.id} should be reconciled with Clerk ID ${clerk_id}`,
          )
        } else {
          await db.insert(users).values({
            id: clerk_id,
            email,
            name: [first_name, last_name].filter(Boolean).join(' ') || email,
            role: 'owner',
            githubData: null,
          })

          console.info(`[Clerk Webhook] user.updated: Created missing local user for ${clerk_id}`)
        }
      }
    } catch {
      console.error(`[Clerk Webhook] user.updated: Error updating user ${email}`)
      // Don't throw error, continue processing
    }
  }

  // Handle user.deleted event
  if (eventType === 'user.deleted') {
    const { id: clerk_id, email_addresses } = clerkEvent.data
    const email = normalizeEmail(email_addresses?.[0]?.email_address)
    console.log(email)
    if (!email) {
      console.warn(`[Clerk Webhook] user.deleted: No email found for user ${clerk_id}`)
      return { success: true }
    }

    try {
      // Note: We don't actually delete the user to preserve audit trail
      // In production, you might want to set a soft-delete flag
      console.info(`[Clerk Webhook] user.deleted: User ${email} deleted in Clerk`)
    } catch {
      console.error(`[Clerk Webhook] user.deleted: Error handling user deletion ${email}`)
      // Don't throw error, continue processing
    }
  }

  return { success: true }
})
