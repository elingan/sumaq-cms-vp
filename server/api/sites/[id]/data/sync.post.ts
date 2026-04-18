import { z } from 'zod'
import { createAuditLog } from '#server/utils/audit'
import { syncSiteDataWorkspace } from '#server/utils/data'
import { getEditableSiteById } from '#server/utils/sites'

const ParamsSchema = z.object({
  siteId: z.string().min(1),
})

const SyncSchema = z.object({
  force: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
  })

  const body = await readBody(event).catch(() => ({}))
  const data = SyncSchema.parse(body)
  const session = await requireUserSession(event)
  const site = await getEditableSiteById(event, params.siteId)
  const result = await syncSiteDataWorkspace(site, data.force)

  if (result.synced) {
    await createAuditLog(
      session.user.id,
      'sync_data_workspace',
      {
        siteId: site.id,
        targetType: 'site',
        targetId: site.id,
        source: result.source,
        diff: result.diff,
      },
      event,
    )
  }

  return {
    data: result,
  }
})
