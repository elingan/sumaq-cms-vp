import { deriveCapabilities } from '#server/utils/permissions'
import { getClerkUser } from '#server/utils/auth'

/**
 * GET /api/auth/capabilities
 * Returns capabilities for the current user in the requested module
 * Query params: module (cms|calendar|appointments|admin), context vars as needed (siteId, locationId, etc)
 */
export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)

  const query = getQuery(event)
  const module = (query.module as 'cms' | 'calendar' | 'appointments' | 'admin') || 'cms'

  if (!['cms', 'calendar', 'appointments', 'admin'].includes(module)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid module. Must be one of: cms, calendar, appointments, admin',
    })
  }

  // Build context from query params
  const context: Record<string, any> = {}
  if (query.siteId) context.siteId = query.siteId
  if (query.locationId) context.locationId = query.locationId
  if (query.roomId) context.roomId = query.roomId
  if (query.appointmentId) context.appointmentId = query.appointmentId

  try {
    const capabilities = await deriveCapabilities(userId, module, context)

    return {
      userId,
      module,
      context,
      capabilities,
    }
  } catch (error: any) {
    console.error('[Capabilities] Error deriving capabilities:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to derive capabilities',
    })
  }
})
