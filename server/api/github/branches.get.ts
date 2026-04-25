import { requireAdminRole } from '#server/utils/auth'
import { z } from 'zod'

const QuerySchema = z.object({
  fullName: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const query = getQuery(event)
  const parsed = QuerySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid query params' })
  }

  const branches = await listRepositoryBranches(parsed.data.fullName, userId)

  return branches
})
