/**
 * @deprecated Password reset/invite links are now handled by Clerk.
 * This module is retained only for type compatibility during migration.
 * Use Clerk's invitation and password reset features instead.
 */

export type PasswordLinkPurpose = 'invite' | 'reset'

// eslint-disable-next-line no-unused-vars
export function hashPasswordLinkToken(token: string): string {
  throw new Error(
    'Password links are no longer supported. Password management and invitations are now handled by Clerk.',
  )
}

export function resolvePasswordLinkOrigin(): string {
  throw new Error(
    'Password links are no longer supported. Password management and invitations are now handled by Clerk.',
  )
}

// eslint-disable-next-line no-unused-vars
export function buildPasswordLink(token: string): string {
  throw new Error(
    'Password links are no longer supported. Password management and invitations are now handled by Clerk.',
  )
}

// eslint-disable-next-line no-unused-vars
export async function invalidatePasswordLinks(
  // eslint-disable-next-line no-unused-vars
  db: unknown,
  // eslint-disable-next-line no-unused-vars
  userId: string,
  // eslint-disable-next-line no-unused-vars
  purpose?: PasswordLinkPurpose,
): Promise<void> {
  throw new Error(
    'Password links are no longer supported. Password management and invitations are now handled by Clerk.',
  )
}

// eslint-disable-next-line no-unused-vars
export async function issuePasswordLink(options: unknown): Promise<{
  token: string
  expiresAt: Date
  link: string
}> {
  throw new Error(
    'Password links are no longer supported. Password management and invitations are now handled by Clerk.',
  )
}

// eslint-disable-next-line no-unused-vars
export async function findValidPasswordLink(db: unknown, token: string): Promise<null> {
  throw new Error(
    'Password links are no longer supported. Password management and invitations are now handled by Clerk.',
  )
}
