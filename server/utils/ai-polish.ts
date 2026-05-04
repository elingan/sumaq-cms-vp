const provider = (process.env.AI_PROVIDER as string) || 'openai'
const apiKey = (process.env.AI_API_KEY as string) || ''

const FIELD_PROMPTS: Record<string, string> = {
  history:
    "This is a therapist's personal story/motivation. Make it warm, authentic, and professional in {language}. Preserve the original meaning and tone. Output only the polished text.",
  motivation:
    "This is a therapist's motivation statement. Make it inspiring, genuine, and professional in {language}. Preserve the original meaning. Output only the polished text.",
  therapeuticApproach:
    'This describes a therapeutic approach. Make it clear, professional, and compassionate in {language}. Use accessible but precise language. Output only the polished text.',
  idealPatientDescription:
    'This describes an ideal patient profile. Make it warm, inclusive, and professional in {language}. Keep it patient-centered. Output only the polished text.',
  firstSessionDescription:
    'This describes a first therapy session. Make it welcoming, reassuring, and professional in {language}. Help reduce patient anxiety through language. Output only the polished text.',
  preparationGuide:
    'This is a preparation guide for new patients. Make it clear, supportive, and encouraging in {language}. Output only the polished text.',
  expectedOutcome:
    'This describes expected therapy outcomes. Make it hopeful but realistic, professional in {language}. Output only the polished text.',
  officeAtmosphere:
    "This describes a therapist's office atmosphere. Make it evocative, warm, and professional in {language}. Help patients visualize the space. Output only the polished text.",
  waitlistPolicy:
    'This describes a waitlist policy. Make it clear, empathetic, and professional in {language}. Output only the polished text.',
  emergencyProtocol:
    'This describes an emergency protocol. Make it clear, reassuring, and professional in {language}. Must be precise and actionable. Output only the polished text.',
  whatINot:
    'This describes what this therapist is NOT about. Make it honest but professional in {language}. Should set clear boundaries while remaining respectful. Output only the polished text.',
}

const DEFAULT_PROMPT =
  'You are a professional copy editor for therapist websites. Polish this text to be warm, professional, and clear in {language}. Preserve the original meaning and tone. Output only the polished text, no explanations.'

function getFieldPrompt(field: string): string {
  return FIELD_PROMPTS[field] || DEFAULT_PROMPT
}

function getSystemPrompt(field: string, locale: string): string {
  const language = locale === 'es' ? 'Spanish' : locale === 'de' ? 'German' : 'English'
  return getFieldPrompt(field).replace('{language}', language)
}

async function polishWithOpenAI(text: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw createError({ statusCode: 502, message: `OpenAI error: ${error}` })
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || text
}

async function polishWithGemini(text: string, systemPrompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw createError({ statusCode: 502, message: `Gemini error: ${error}` })
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text
}

export async function polishText(text: string, field: string, locale: string): Promise<string> {
  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'AI_API_KEY not configured' })
  }

  const systemPrompt = getSystemPrompt(field, locale)

  if (provider === 'gemini') {
    return polishWithGemini(text, systemPrompt)
  }

  return polishWithOpenAI(text, systemPrompt)
}
