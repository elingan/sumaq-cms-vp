import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import type { Database } from '../db/client'
import { passwordResets } from '../db/schema'

export type PasswordLinkPurpose = 'invite' | 'reset'

const PASSWORD_LINK_TTL_MS: Record<PasswordLinkPurpose, number> = {
  invite: 1000 * 60 * 60 * 24 * 3,
  reset: 1000 * 60 * 60,
}

type PasswordLinkDb = Pick<Database, 'delete' | 'insert' | 'select'>

interface PasswordLinkOptions {
  event?: unknown
  origin?: string
}

interface IssuePasswordLinkOptions extends PasswordLinkOptions {
  db: PasswordLinkDb
  userId: string
  purpose: PasswordLinkPurpose
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    return value
  }

  return Array.isArray(value) ? (value[0] ?? null) : null
}

export function hashPasswordLinkToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function resolvePasswordLinkOrigin({ event, origin }: PasswordLinkOptions = {}): string {
  const explicitOrigin = origin || process.env.NUXT_PUBLIC_APP_URL

  if (explicitOrigin) {
    return trimTrailingSlash(explicitOrigin)
  }

  const requestEvent = event as
    | {
        node?: {
          req?: {
            headers?: Record<string, string | string[] | undefined>
            socket?: { encrypted?: boolean }
          }
        }
      }
    | undefined

  if (requestEvent?.node?.req) {
    const host =
      getHeaderValue(requestEvent.node.req.headers?.['x-forwarded-host']) ||
      getHeaderValue(requestEvent.node.req.headers?.host)
    const protocol =
      getHeaderValue(requestEvent.node.req.headers?.['x-forwarded-proto']) ||
      (requestEvent.node.req.socket?.encrypted ? 'https' : 'http')

    if (host) {
      return trimTrailingSlash(`${protocol}://${host}`)
    }
  }

  return 'http://localhost:3000'
}

export function buildPasswordLink(token: string, options: PasswordLinkOptions = {}): string {
  const origin = resolvePasswordLinkOrigin(options)
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`
}

export async function invalidatePasswordLinks(
  db: PasswordLinkDb,
  userId: string,
  purpose?: PasswordLinkPurpose,
): Promise<void> {
  const conditions = [eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)]

  if (purpose) {
    conditions.push(eq(passwordResets.purpose, purpose))
  }

  await db.delete(passwordResets).where(and(...conditions))
}

export async function issuePasswordLink({
  db,
  userId,
  purpose,
  event,
  origin,
}: IssuePasswordLinkOptions) {
  await invalidatePasswordLinks(db, userId, purpose)

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + PASSWORD_LINK_TTL_MS[purpose])

  await db.insert(passwordResets).values({
    userId,
    tokenHash: hashPasswordLinkToken(token),
    purpose,
    expiresAt,
  })

  return {
    token,
    expiresAt,
    link: buildPasswordLink(token, { event, origin }),
  }
}

export async function findValidPasswordLink(db: PasswordLinkDb, token: string) {
  const [passwordLink] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, hashPasswordLinkToken(token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(passwordResets.createdAt))
    .limit(1)

  return passwordLink ?? null
}
