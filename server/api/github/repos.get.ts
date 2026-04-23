import { requireUserSession } from '#server/utils/auth'
import { z } from 'zod'

const QuerySchema = z.object({
  prefix: z.string().default('www-').optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin' && session.user.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const query = getQuery(event)
  const parsed = QuerySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid query params' })
  }

  const repositories = await listInstallationRepositories(parsed.data.prefix ?? 'www-')

  return repositories
})
