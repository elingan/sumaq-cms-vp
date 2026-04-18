import { z } from 'zod'
import { buildPageDataFileName, getSiteDataFileContent } from '#server/utils/data'
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
  const fileName = buildPageDataFileName(params.name)
  const content = await getSiteDataFileContent(site, fileName)

  return {
    data: {
      fileName,
      exists: content !== null,
      content: content ? JSON.parse(content) : {},
    },
  }
})
