import { blob } from 'hub:blob'
import { getClerkUser } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await getClerkUser(event)

  const pathSegments = (event.context.params?.path || '') as string
  const fullPath = `onboarding/${pathSegments}`

  const file = await blob.get(fullPath)

  if (!file) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  return file
})
