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
