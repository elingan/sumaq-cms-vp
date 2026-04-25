import { requireAdminRole } from '#server/utils/auth'
import { z } from 'zod'

const QuerySchema = z.object({
  prefix: z.string().default('www-').optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const query = getQuery(event)
  const parsed = QuerySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid query params' })
  }

  const repositories = await listInstallationRepositories(parsed.data.prefix ?? 'www-', userId)

  return repositories
})
