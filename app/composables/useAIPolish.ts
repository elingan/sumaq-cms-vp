const polishCache = new Map<string, string>()

export function useAIPolish() {
  const isPolishing = ref(false)
  const polishedText = ref<string | null>(null)
  const error = ref<string | null>(null)

  function hashInput(text: string, field: string, language: string): string {
    return `${text}|${field}|${language}`
  }

  async function polish(text: string, field: string, language = 'en'): Promise<string> {
    if (!text.trim()) {
      return text
    }

    const cacheKey = hashInput(text, field, language)

    if (polishCache.has(cacheKey)) {
      polishedText.value = polishCache.get(cacheKey)!
      return polishedText.value!
    }

    isPolishing.value = true
    error.value = null

    try {
      const result = await $fetch<{ text: string }>('/api/onboarding/ai-polish', {
        method: 'POST',
        body: { text, field, language },
      })

      polishedText.value = result.text
      polishCache.set(cacheKey, result.text)
      return result.text
    } catch (e: any) {
      error.value = e?.message || 'AI polish failed'
      throw e
    } finally {
      isPolishing.value = false
    }
  }

  function clearCache() {
    polishCache.clear()
  }

  return {
    isPolishing,
    polishedText,
    error,
    polish,
    clearCache,
  }
}
