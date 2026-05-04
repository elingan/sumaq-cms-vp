import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { onboardingResponses } from '#server/db/schema'
import { getClerkUser } from '#server/utils/auth'

const SaveSchema = z.object({
  section: z.number().int().min(0).max(10),
  data: z.record(z.string(), z.any()),
})

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  const body = await readBody(event)
  const result = SaveSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()

  const [existing] = await db
    .select({
      id: onboardingResponses.id,
      content: onboardingResponses.content,
      completedSections: onboardingResponses.completedSections,
    })
    .from(onboardingResponses)
    .where(eq(onboardingResponses.userId, userId))
    .limit(1)

  const currentContent = (existing?.content as Record<string, unknown>) ?? {}
  const completedSet = new Set<number>(existing?.completedSections ?? [])

  currentContent[`section_${result.data.section}`] = result.data.data
  completedSet.add(result.data.section)

  const isComplete = completedSet.size >= 11

  if (existing) {
    await db
      .update(onboardingResponses)
      .set({
        content: currentContent as Record<string, unknown>,
        completedSections: Array.from(completedSet),
        isComplete,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(onboardingResponses.id, existing.id))
  } else {
    await db.insert(onboardingResponses).values({
      userId,
      content: currentContent as Record<string, unknown>,
      completedSections: Array.from(completedSet),
      isComplete,
    })
  }

  return {
    isComplete,
    completedSections: Array.from(completedSet),
  }
})
