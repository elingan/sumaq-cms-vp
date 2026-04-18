import { z } from 'zod'
import { createAuditLog } from '#server/utils/audit'
import { buildCollectionDataFileName, saveSiteDataFile } from '#server/utils/data'
import { getEditableSiteById } from '#server/utils/sites'

const ParamsSchema = z.object({
  siteId: z.string().min(1),
  name: z
    .string()
    .min(1)
    .regex(/^[\w.-]+$/),
  slug: z
    .string()
    .min(1)
    .regex(/^[\w.-]+$/),
})

const BodySchema = z.object({
  content: z.record(z.string(), z.unknown()),
})

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
    name: getRouterParam(event, 'name'),
    slug: getRouterParam(event, 'slug'),
  })

  const body = BodySchema.parse(await readBody(event))
  const session = await requireUserSession(event)
  const site = await getEditableSiteById(event, params.siteId)
  const fileName = buildCollectionDataFileName(params.name, params.slug)

  const result = await saveSiteDataFile(site, fileName, JSON.stringify(body.content, null, 2))

  await createAuditLog(
    session.user.id,
    'save_collection_data_draft',
    {
      siteId: site.id,
      targetType: 'site',
      targetId: site.id,
      fileName,
      path: result.path,
    },
    event,
  )

  return {
    data: {
      saved: true,
      fileName,
      path: result.path,
    },
  }
})
