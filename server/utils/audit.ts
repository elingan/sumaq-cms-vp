import { auditLogs } from '../db/schema'
import type { H3Event } from 'h3'

export async function createAuditLog(
  userId: string | null,
  action: string,
  details: Record<string, unknown>,
  _event?: H3Event,
) {
  const db = useDrizzle()
  await db.insert(auditLogs).values({
    userId,
    action,
    targetType: details.targetType as string | undefined,
    targetId: details.targetId as string | undefined,
    changes: details,
  })
}

/**
 * Audit user role change (typically from Clerk webhook)
 */
export async function auditUserRoleChange(
  userId: string,
  oldRole: string | undefined,
  newRole: string | undefined,
  source: 'clerk_webhook' | 'admin_api' | 'manual',
) {
  if (oldRole === newRole) return // No change

  await createAuditLog(null, 'user_role_changed', {
    targetType: 'user',
    targetId: userId,
    oldRole,
    newRole,
    source,
  })
}

/**
 * Audit user deletion
 */
export async function auditUserDeleted(
  userId: string,
  email: string,
  source: 'clerk_webhook' | 'admin_api',
) {
  await createAuditLog(null, 'user_deleted', {
    targetType: 'user',
    targetId: userId,
    email,
    source,
  })
}

/**
 * Audit user sync event (creation or reconciliation)
 */
export async function auditUserSynced(
  userId: string,
  email: string,
  action: 'created' | 'updated' | 'reconciled',
  changes: Record<string, unknown>,
) {
  await createAuditLog(null, `user_synced_${action}`, {
    targetType: 'user',
    targetId: userId,
    email,
    changes,
  })
}
