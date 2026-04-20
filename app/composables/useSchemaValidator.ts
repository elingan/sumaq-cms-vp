import * as z from 'zod'
import type { SchemaField, SchemaSection } from '#shared/types/schema'
import { formatZodErrors, formatFieldError, type FieldError } from '#shared/utils/validation'

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
    case 'richtext':
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
    case 'video':
      return z.string().optional()
    case 'select': {
      if (Array.isArray(field.options) && field.options.length > 0) {
        return z.enum(field.options as [string, ...string[]]).optional()
      }

      if (field.options && typeof field.options === 'object' && !Array.isArray(field.options)) {
        const config = field.options
        const values = config.values

        if (Array.isArray(values) && values.length > 0) {
          const allowedValues =
            typeof values[0] === 'string'
              ? (values as string[])
              : (values as { value: string }[]).map((option) => option.value)

          if (allowedValues.length) {
            const enumSchema = z.enum(allowedValues as [string, ...string[]])
            return config.multiple ? z.array(enumSchema).optional() : enumSchema.optional()
          }
        }
      }

      return z.string().optional()
    }
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
    case 'media': {
      if (!field.fields?.length) return z.record(z.string(), z.unknown()).optional()
      const mediaShape: Record<string, z.ZodTypeAny> = {}
      for (const f of field.fields) {
        mediaShape[f.id] = fieldToZod(f)
      }
      return z.object(mediaShape).optional()
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

  function getSectionLabel(sectionId: string): string {
    const section = sections.value.find((s) => s.id === sectionId)
    return section?.label ?? sectionId
  }

  function getFieldLabel(sectionId: string, fieldId: string): string | undefined {
    const section = sections.value.find((s) => s.id === sectionId)
    if (!section) return undefined
    const field = section.fields.find((f) => f.id === fieldId)
    return field?.label
  }

  function validate(formState: Record<string, unknown>): Record<string, string> {
    const result = zodSchema.value.safeParse(formState)

    if (result.success) {
      return {}
    }

    const formattedErrors = formatZodErrors(result.error.issues, getSectionLabel, getFieldLabel)

    const errors: Record<string, string> = {}
    for (const [key, error] of Object.entries(formattedErrors)) {
      errors[key] = formatFieldError(error)
    }

    return errors
  }

  function validateField(sectionId: string, fieldId: string, value: unknown): FieldError | null {
    const section = sections.value.find((s) => s.id === sectionId)
    if (!section) return null

    const field = section.fields.find((f) => f.id === fieldId)
    if (!field) return null

    const fieldSchema = fieldToZod(field)
    const sectionSchema = z.object({ [fieldId]: fieldSchema.optional() })
    const result = sectionSchema.safeParse({ [fieldId]: value })

    if (result.success) return null

    const issue = result.error.issues[0]
    if (!issue) return null

    return {
      message: issue.message,
      code: issue.code,
      path: `${getSectionLabel(sectionId)} → ${field.label}`,
    }
  }

  return { zodSchema, validate, validateField }
}
