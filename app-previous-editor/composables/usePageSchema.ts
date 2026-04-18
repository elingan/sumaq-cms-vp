import { ref } from 'vue'
import type { SchemaSection } from '~/composables/useSchemaValidator'
import schemaYaml from '~/assets/cms/page.yaml?raw'
import yaml from 'js-yaml'

export const usePageSchema = (type?: string, name?: string) => {
  const schema = ref<Record<string, SchemaSection>>({})

  const loadSchema = async () => {
    try {
      // Si se proveen type y name, cargar dinámicamente desde public
      if (type && name) {
        const schemaText = await $fetch(`/cms/${type}.${name}.yaml`, { responseType: 'text' })
        const schemaData = yaml.load(schemaText) as Record<string, SchemaSection>
        Object.assign(schema.value, schemaData)
        return schema.value
      }

      // Fallback a importación estática legacy
      const schemaData = yaml.load(schemaYaml) as Record<string, SchemaSection>
      Object.assign(schema.value, schemaData)
      return schema.value
    } catch (error) {
      console.error('Error loading schema:', error)
      throw error
    }
  }

  return {
    schema,
    loadSchema,
  }
}
