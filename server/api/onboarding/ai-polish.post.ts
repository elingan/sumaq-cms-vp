import { z } from 'zod'
import { getClerkUser } from '#server/utils/auth'
import { polishText } from '#server/utils/ai-polish'

const AiPolishSchema = z.object({
  text: z.string().min(1).max(5000),
  field: z.string().min(1),
  language: z.string().min(2).max(5).default('en'),
})

export default defineEventHandler(async (event) => {
  await getClerkUser(event)

  const body = await readBody(event)
  const result = AiPolishSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const polished = await polishText(result.data.text, result.data.field, result.data.language)

  return { text: polished }
})
