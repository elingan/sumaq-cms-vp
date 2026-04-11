import * as z from 'zod'
import type { SchemaField, SchemaSection } from '#shared/types/schema'

function isUrlOrRelativeAnchor(val: string): boolean {
  if (!val) return true
  if (val.startsWith('#') || val.startsWith('/')) return true
  try {
    new URL(val)
    return true
  } catch {
    return false
  }
}

function fieldToZod(field: SchemaField): z.ZodTypeAny {
  switch (field.type) {
    case 'string':
    case 'text':
      return z.string().optional()
    case 'number':
      return z.number().optional()
    case 'boolean':
      return z.boolean().optional()
    case 'date':
      return z.string().optional()
    case 'url':
      return z.string().refine(isUrlOrRelativeAnchor, { message: 'Invalid URL' }).optional()
    case 'image':
      return z.string().optional()
    case 'select':
      if (field.options && field.options.length > 0) {
        return z.enum(field.options as [string, ...string[]]).optional()
      }
      return z.string().optional()
    case 'object': {
      if (!field.fields?.length) return z.record(z.string(), z.unknown()).optional()
      const shape: Record<string, z.ZodTypeAny> = {}
      for (const f of field.fields) {
        shape[f.id] = fieldToZod(f)
      }
      return z.object(shape).optional()
    }
    case 'list': {
      if (!field.fields?.length) return z.array(z.unknown()).optional()
      const itemShape: Record<string, z.ZodTypeAny> = {}
      for (const f of field.fields) {
        itemShape[f.id] = fieldToZod(f)
      }
      return z.array(z.object(itemShape)).optional()
    }
    default:
      return z.unknown().optional()
  }
}

export function useSchemaValidator(sections: Ref<SchemaSection[]>) {
  const zodSchema = computed(() => {
    const shape: Record<string, z.ZodTypeAny> = {}
    for (const section of sections.value) {
      const sectionShape: Record<string, z.ZodTypeAny> = {}
      for (const field of section.fields) {
        sectionShape[field.id] = fieldToZod(field)
      }
      shape[section.id] = z.object(sectionShape).optional()
    }
    return z.object(shape)
  })

  function validate(formState: Record<string, unknown>): Record<string, string> {
    const result = zodSchema.value.safeParse(formState)
    const errors: Record<string, string> = {}

    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path
          .map((segment, i) => {
            if (typeof segment === 'number') {
              return `Item ${segment + 1}`
            }
            // Capitalise section/field path segments for readability
            const section = sections.value.find((s) => s.id === issue.path[0])
            if (i === 0 && section) return section.label
            if (i === 1 && section) {
              const field = section.fields.find((f: SchemaField) => f.id === issue.path[1])
              return field?.label ?? segment
            }
            return segment
          })
          .join(' → ')
        errors[issue.path.join('.')] = `${path}: ${issue.message}`
      }
    }

    return errors
  }

  return { zodSchema, validate }
}
