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

  // Handle user.created event
  if (eventType === 'user.created') {
    const { id: clerk_id, email_addresses, first_name, last_name } = clerkEvent.data
    const email = email_addresses?.[0]?.email_address

    if (!email) {
      console.warn(`[Clerk Webhook] user.created: No email found for user ${clerk_id}`)
      return { success: true }
    }

    try {
      // Check if user already exists
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1)

      if (!existing.length) {
        // Create new user with default role 'owner'
        await db.insert(users).values({
          email: email.toLowerCase(),
          name: [first_name, last_name].filter(Boolean).join(' ') || email,
          role: 'owner', // Default role for new users
          githubData: null,
        })

        console.info(
          `[Clerk Webhook] user.created: Created local user for ${email} with role 'owner'`,
        )
      } else {
        console.info(`[Clerk Webhook] user.created: User already exists for ${email}`)
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
    const email = email_addresses?.[0]?.email_address

    if (!email) {
      console.warn(`[Clerk Webhook] user.updated: No email found for user ${clerk_id}`)
      return { success: true }
    }

    try {
      // Update existing user
      await db
        .update(users)
        .set({
          name: [first_name, last_name].filter(Boolean).join(' ') || email,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email.toLowerCase()))

      console.info(`[Clerk Webhook] user.updated: Updated user ${email}`)
    } catch {
      console.error(`[Clerk Webhook] user.updated: Error updating user ${email}`)
      // Don't throw error, continue processing
    }
  }

  // Handle user.deleted event
  if (eventType === 'user.deleted') {
    const { id: clerk_id, email_addresses } = clerkEvent.data
    const email = email_addresses?.[0]?.email_address

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
