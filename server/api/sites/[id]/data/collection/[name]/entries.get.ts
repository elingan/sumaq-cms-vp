import { z } from 'zod'
import { listCollectionEntrySlugs } from '#server/utils/data'
import { getAccessibleSiteById } from '#server/utils/sites'

const ParamsSchema = z.object({
  siteId: z.string().min(1),
  name: z
    .string()
    .min(1)
    .regex(/^[\w.-]+$/),
})

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
    name: getRouterParam(event, 'name'),
  })

  const site = await getAccessibleSiteById(event, params.siteId)
  const entries = await listCollectionEntrySlugs(site, params.name)

  return {
    data: {
      collection: params.name,
      entries,
    },
  }
})
