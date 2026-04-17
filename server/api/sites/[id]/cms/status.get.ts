import { z } from 'zod'
import { getSiteCmsNavigation } from '#server/utils/cms'
import { getAccessibleSiteById } from '#server/utils/sites'

const ParamsSchema = z.object({
  siteId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
  })

  const site = await getAccessibleSiteById(event, params.siteId)
  const navigation = await getSiteCmsNavigation(site)

  return {
    data: {
      siteId: site.id,
      source: navigation.source,
      usingExampleCms: navigation.usingExampleCms,
      draft: navigation.draft,
    },
  }
})
