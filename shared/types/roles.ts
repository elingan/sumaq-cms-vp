export const UserRole = {
  Admin: 'admin',
  Partner: 'partner',
  Owner: 'owner',
  Editor: 'editor',
} as const

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole]

export const SiteUserRole = {
  Owner: 'owner',
  Editor: 'editor',
  Partner: 'partner',
} as const

export type SiteUserRoleValue = (typeof SiteUserRole)[keyof typeof SiteUserRole]

export const SiteStatus = {
  Active: 'active',
  Archived: 'archived',
} as const

export type SiteStatusValue = (typeof SiteStatus)[keyof typeof SiteStatus]

export const PageStatus = {
  Draft: 'draft',
  Published: 'published',
} as const

export type PageStatusValue = (typeof PageStatus)[keyof typeof PageStatus]

export const PasswordResetPurpose = {
  Invite: 'invite',
  Reset: 'reset',
} as const

export type PasswordResetPurposeValue =
  (typeof PasswordResetPurpose)[keyof typeof PasswordResetPurpose]
