import { getAccessibleSiteBySlug } from '#server/utils/sites'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, message: 'Missing site slug' })
  }

  return getAccessibleSiteBySlug(event, slug)
})
