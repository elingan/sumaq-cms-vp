import { getAccessibleSiteById } from '#server/utils/sites'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  return getAccessibleSiteById(event, id)
})
