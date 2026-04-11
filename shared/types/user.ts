export type UserRole = 'admin' | 'partner' | 'owner' | 'editor'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}
