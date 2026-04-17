import { z } from 'zod'
import { getSiteCmsDraftContent } from '#server/utils/cms'
import { getAccessibleSiteById } from '#server/utils/sites'

const ParamsSchema = z.object({
  siteId: z.string().min(1),
  type: z.enum(['page', 'collection']),
  name: z
    .string()
    .min(1)
    .regex(/^[\w.-]+$/, 'Invalid schema name'),
})

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
    type: getRouterParam(event, 'type'),
    name: getRouterParam(event, 'name'),
  })

  const site = await getAccessibleSiteById(event, params.siteId)
  const result = await getSiteCmsDraftContent(site, params.type, params.name)

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return result.content
})
