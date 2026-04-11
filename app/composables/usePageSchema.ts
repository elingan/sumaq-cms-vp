import { parse } from 'yaml'
import type { SchemaSection, SchemaField } from '#shared/types/schema'

// Parse raw YAML section records into typed SchemaSection[]
function parseSections(raw: Record<string, unknown>): SchemaSection[] {
  return Object.entries(raw).map(([key, value]) => {
    const section = value as Record<string, unknown>
    const sectionId = (section.id as string) ?? key
    return {
      id: sectionId,
      key: sectionId,
      label: (section.label as string) ?? key,
      description: section.description as string | undefined,
      icon: section.icon as string | undefined,
      fields: ((section.fields as unknown[]) ?? []).map((f) => {
        const field = f as Record<string, unknown>
        const fieldId = field.id as string
        return {
          id: fieldId,
          key: fieldId,
          label: field.label as string,
          type: field.type as SchemaField['type'],
          required: field.required as boolean | undefined,
          placeholder: field.placeholder as string | undefined,
          options: field.options as string[] | undefined,
          fields: field.fields
            ? ((field.fields as unknown[]).map((nf) => {
                const nField = nf as Record<string, unknown>
                const nFieldId = nField.id as string
                return {
                  id: nFieldId,
                  key: nFieldId,
                  label: nField.label as string,
                  type: nField.type as SchemaField['type'],
                  required: nField.required as boolean | undefined,
                  placeholder: nField.placeholder as string | undefined,
                  options: nField.options as string[] | undefined,
                }
              }) as SchemaField[])
            : undefined,
        } as SchemaField
      }),
    }
  })
}

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
