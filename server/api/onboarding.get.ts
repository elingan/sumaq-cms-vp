import { eq } from 'drizzle-orm'
import { onboardingResponses } from '#server/db/schema'
import { getClerkUser } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  const db = useDrizzle()

  const [row] = await db
    .select()
    .from(onboardingResponses)
    .where(eq(onboardingResponses.userId, userId))
    .limit(1)

  return row ?? null
})
