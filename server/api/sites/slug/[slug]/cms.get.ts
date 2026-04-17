import { getSiteCmsNavigation } from '#server/utils/cms'
import { getAccessibleSiteBySlug } from '#server/utils/sites'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, message: 'Missing site slug' })
  }

  const site = await getAccessibleSiteBySlug(event, slug)

  return getSiteCmsNavigation(site)
})
