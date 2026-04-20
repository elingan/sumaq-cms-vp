import type { UserRoleValue } from './roles'

export type { UserRoleValue as UserRole }

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRoleValue
}
