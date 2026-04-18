import { z } from 'zod'
import { buildCollectionDataFileName, getSiteDataFileContent } from '#server/utils/data'
import { getAccessibleSiteById } from '#server/utils/sites'

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

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
    name: getRouterParam(event, 'name'),
    slug: getRouterParam(event, 'slug'),
  })

  const site = await getAccessibleSiteById(event, params.siteId)
  const fileName = buildCollectionDataFileName(params.name, params.slug)
  const content = await getSiteDataFileContent(site, fileName)

  return {
    data: {
      fileName,
      exists: content !== null,
      content: content ? JSON.parse(content) : {},
    },
  }
})
