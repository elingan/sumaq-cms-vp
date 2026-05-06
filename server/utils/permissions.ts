import { and, eq } from 'drizzle-orm'
import { siteUsers, users } from '#server/db/schema'
import type { UserRoleValue, SiteUserRoleValue } from '#shared/types/roles'
import { UserRole } from '#shared/types/roles'

/**
 * Central permission evaluator: Determines if an actor can perform an action on a resource
 *
 * Usage:
 *   const canEdit = await canPerform(userId, 'cms', 'edit_site', { siteId })
 *   if (!canEdit) throw createError(403, 'Forbidden')
 */

export interface PermissionContext {
  // Resource identifiers
  siteId?: string
  locationId?: string
  roomId?: string
  appointmentId?: string
  userId?: string // Target user ID (for user management actions)
  // Additional context
  [key: string]: unknown
}

export interface PermissionDecision {
  allowed: boolean
  reason?: string
}

/**
 * Get user's global role from Clerk metadata (cached in local DB)
 */
async function getUserGlobalRole(userId: string): Promise<UserRoleValue | null> {
  const db = useDrizzle()
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!user?.role) return null
  return user.role === UserRole.Admin ? UserRole.Admin : UserRole.User
}

/**
 * Get user's role in a specific site
 */
async function getUserSiteRole(userId: string, siteId: string): Promise<SiteUserRoleValue | null> {
  const db = useDrizzle()
  const [membership] = await db
    .select({ role: siteUsers.role })
    .from(siteUsers)
    .where(and(eq(siteUsers.userId, userId), eq(siteUsers.siteId, siteId)))
    .limit(1)
  return (membership?.role as SiteUserRoleValue) || null
}

/**
 * CMS (Sites & Pages) Permissions
 */
async function evaluateCmsPermission(
  userId: string,
  action: string,
  context: PermissionContext,
): Promise<PermissionDecision> {
  const globalRole = await getUserGlobalRole(userId)

  // Admin can do anything
  if (globalRole === UserRole.Admin) {
    return { allowed: true, reason: 'Global admin' }
  }

  const { siteId } = context

  if (!siteId) {
    return { allowed: false, reason: 'Missing siteId context' }
  }

  const siteRole = await getUserSiteRole(userId, siteId)

  if (!siteRole) {
    return { allowed: false, reason: `User is not a member of site ${siteId}` }
  }

  // Capability matrix for CMS
  const canPerformCms: Record<SiteUserRoleValue, string[]> = {
    owner: ['view_site', 'edit_site', 'publish_site', 'invite_member', 'manage_members'],
    editor: ['view_site', 'edit_site', 'invite_member'],
    partner: ['view_site'],
  }

  const allowedActions = canPerformCms[siteRole] || []
  const isAllowed = allowedActions.includes(action)

  return {
    allowed: isAllowed,
    reason: isAllowed ? `${siteRole} can ${action}` : `${siteRole} cannot ${action}`,
  }
}

/**
 * Calendar (Locations, Rooms, Bookings) Permissions
 */
async function evaluateCalendarPermission(
  userId: string,
  _action: string,
  _context: PermissionContext,
): Promise<PermissionDecision> {
  const globalRole = await getUserGlobalRole(userId)

  // For now, only admins can manage calendar
  // Future: implement location/room-level ownership
  if (globalRole === UserRole.Admin) {
    return { allowed: true, reason: 'Global admin' }
  }

  return {
    allowed: false,
    reason: 'Only admins can manage calendar (location/room ownership not yet implemented)',
  }
}

/**
 * Appointments Permissions (inherits from Calendar)
 */
async function evaluateAppointmentsPermission(
  userId: string,
  _action: string,
  _context: PermissionContext,
): Promise<PermissionDecision> {
  const globalRole = await getUserGlobalRole(userId)

  // For now, only admins can manage appointments
  // Future: implement invitation-based access
  if (globalRole === UserRole.Admin) {
    return { allowed: true, reason: 'Global admin' }
  }

  return {
    allowed: false,
    reason: 'Only admins can manage appointments (delegation not yet implemented)',
  }
}

/**
 * Admin Panel Permissions
 */
async function evaluateAdminPermission(
  userId: string,
  action: string,
  _context: PermissionContext,
): Promise<PermissionDecision> {
  const globalRole = await getUserGlobalRole(userId)

  // Only admins can access admin panel
  if (globalRole !== UserRole.Admin) {
    return { allowed: false, reason: 'Not a global admin' }
  }

  // Admin-specific actions
  const adminActions = [
    'list_users',
    'create_user',
    'update_user',
    'delete_user',
    'list_sites',
    'create_site',
    'manage_site_members',
    'manage_bookings',
    'manage_locations',
    'manage_rooms',
    'sync_users',
    'view_github_status',
  ]

  const isAllowed = adminActions.includes(action)
  return {
    allowed: isAllowed,
    reason: isAllowed ? 'Admin action allowed' : 'Action not recognized',
  }
}

/**
 * Main permission evaluator dispatcher
 */
export async function canPerform(
  userId: string,
  module: 'cms' | 'calendar' | 'appointments' | 'admin',
  action: string,
  context: PermissionContext = {},
): Promise<PermissionDecision> {
  try {
    switch (module) {
      case 'cms':
        return await evaluateCmsPermission(userId, action, context)
      case 'calendar':
        return await evaluateCalendarPermission(userId, action, context)
      case 'appointments':
        return await evaluateAppointmentsPermission(userId, action, context)
      case 'admin':
        return await evaluateAdminPermission(userId, action, context)
      default:
        return { allowed: false, reason: `Unknown module: ${String(module)}` }
    }
  } catch (error: unknown) {
    console.error(`[Permissions] Error evaluating ${module}/${action}:`, error)
    return { allowed: false, reason: 'Permission evaluation error' }
  }
}

/**
 * Helper: Check permission and throw 403 if denied
 */
export async function requirePermission(
  userId: string,
  module: 'cms' | 'calendar' | 'appointments' | 'admin',
  action: string,
  context: PermissionContext = {},
) {
  const decision = await canPerform(userId, module, action, context)
  if (!decision.allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      data: { reason: decision.reason },
    })
  }
  return decision
}

/**
 * Derive capabilities for a user in a given module and context
 * Used to populate frontend UI state
 */
export async function deriveCapabilities(
  userId: string,
  module: 'cms' | 'calendar' | 'appointments' | 'admin',
  context: PermissionContext = {},
): Promise<Record<string, boolean>> {
  const capabilities: Record<string, boolean> = {}

  // Map action lists by module
  const actionsByModule: Record<string, string[]> = {
    cms: ['view_site', 'edit_site', 'publish_site', 'invite_member', 'manage_members'],
    calendar: [
      'view_locations',
      'create_location',
      'manage_locations',
      'create_booking',
      'manage_bookings',
    ],
    appointments: ['view_appointments', 'create_appointment', 'manage_appointments'],
    admin: [
      'list_users',
      'create_user',
      'update_user',
      'delete_user',
      'list_sites',
      'create_site',
      'manage_site_members',
      'manage_bookings',
      'sync_users',
    ],
  }

  const actions = actionsByModule[module] || []

  // Evaluate each action
  for (const action of actions) {
    const decision = await canPerform(userId, module, action, context)
    capabilities[action] = decision.allowed
  }

  return capabilities
}
