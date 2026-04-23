import { requireUserSession } from '#server/utils/auth'
import { z } from 'zod'

const QuerySchema = z.object({
  fullName: z.string().min(1),
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

  const branches = await listRepositoryBranches(parsed.data.fullName)

  return branches
})
