import { eq } from 'drizzle-orm'
import { users } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { listAllUsers } from '#server/utils/clerk-users'
import { createAuditLog } from '#server/utils/audit'

export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdminRole(event)

  const clerkUsers = await listAllUsers(event)
  const db = useDrizzle()

  let syncedCount = 0
  let errorCount = 0

  for (const clerkUser of clerkUsers) {
    const email = clerkUser.email?.toLowerCase().trim()
    if (!email) {
      errorCount++
      continue
    }

    const validRoles = ['admin', 'partner', 'owner', 'editor']
    const role = validRoles.includes(clerkUser.role as string)
      ? (clerkUser.role as 'admin' | 'partner' | 'owner' | 'editor')
      : 'editor'

    try {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, clerkUser.id))
        .limit(1)

      if (existing) {
        await db
          .update(users)
          .set({
            email,
            name: clerkUser.fullName || email,
            role,
            updatedAt: new Date(),
          })
          .where(eq(users.id, clerkUser.id))
      } else {
        await db.insert(users).values({
          id: clerkUser.id,
          email,
          name: clerkUser.fullName || email,
          role,
          githubData: null,
        })
      }
      syncedCount++
    } catch (error) {
      console.error(`[Sync] Error syncing user ${clerkUser.id}:`, error)
      errorCount++
    }
  }

  await createAuditLog(
    adminId,
    'sync_users',
    {
      targetType: 'system',
      details: `Manual sync completed. Synced: ${syncedCount}, Errors: ${errorCount}`,
      syncedCount,
    },
    event,
  )

  return { success: true, syncedCount, errorCount }
})
