import { parse } from 'yaml'
import type { SchemaSection } from '#shared/types/schema'
import { parseSections } from '#shared/utils/schema'

export async function usePageSchema(siteId?: string, pageType?: string) {
  const sections = ref<SchemaSection[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadSchema() {
    loading.value = true
    error.value = null

    try {
      if (siteId && pageType) {
        // Production: fetch from GitHub via API
        const raw = await $fetch<string>(`/api/github/files/${siteId}?type=${pageType}`, {
          responseType: 'text',
        }).catch(() => null)

        if (raw) {
          sections.value = parseSections(parse(raw))
          return
        }
      }

      // Development fallback: load bundled example schema
      const yamlText = await $fetch<string>('/api/schema/page.index.yaml', {
        responseType: 'text',
      }).catch(() => null)

      if (yamlText) {
        sections.value = parseSections(parse(yamlText))
      }
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  await loadSchema()

  return { sections, loading, error, reload: loadSchema }
}
