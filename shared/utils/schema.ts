import type { SchemaField, SchemaSection, SelectOption } from '../types/schema'

export interface ParsedSchemaResult {
  sections: SchemaSection[]
}

function isSelectOption(value: unknown): value is SelectOption {
  return typeof value === 'object' && value !== null && 'value' in value && 'label' in value
}

function parseFieldId(input: Record<string, unknown>, fallback: string): string {
  return (input.id as string) ?? (input.key as string) ?? fallback
}

function parseSelectOptions(options: unknown): SchemaField['options'] | undefined {
  if (!options) return undefined

  if (Array.isArray(options)) {
    if (options.length === 0) return undefined

    const first = options[0]
    if (typeof first === 'string') {
      return options as string[]
    }

    if (isSelectOption(first)) {
      return { values: options as SelectOption[] }
    }

    return undefined
  }

  if (typeof options === 'object' && options !== null) {
    const config = options as Record<string, unknown>
    const values = config.values

    if (Array.isArray(values) && values.length > 0) {
      const parsedValues: string[] = values.map((v) => {
        if (typeof v === 'string') return v
        if (isSelectOption(v)) return (v as SelectOption).value
        return String(v)
      })

      return {
        values: parsedValues,
        multiple: config.multiple as boolean | undefined,
      }
    }
  }

  return undefined
}

export function parseField(input: Record<string, unknown>): SchemaField {
  const fieldId = parseFieldId(input, 'unknown')
  const editableIn = input.editableIn as SchemaField['editableIn'] | undefined

  return {
    id: fieldId,
    key: fieldId,
    label: (input.label as string) ?? fieldId,
    type: (input.type as SchemaField['type']) ?? 'string',
    fieldId: (input.fieldId as string) ?? undefined,
    required: input.required as boolean | undefined,
    description: input.description as string | undefined,
    helpText: input.helpText as string | undefined,
    placeholder: input.placeholder as string | undefined,
    editableIn,
    options: parseSelectOptions(input.options),
    fields: parseFieldsArray(input.fields as unknown[] | undefined),
  }
}

export function parseFieldsArray(fields: unknown[] | undefined): SchemaField[] | undefined {
  if (!Array.isArray(fields) || fields.length === 0) return undefined

  return fields
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map(parseField)
}

export function parseSection(sectionKey: string, sectionData: unknown): SchemaSection | null {
  if (typeof sectionData !== 'object' || sectionData === null) {
    return null
  }

  const section = sectionData as Record<string, unknown>
  const sectionId = (section.id as string) ?? sectionKey

  const parsedFields = parseFieldsArray(section.fields as unknown[] | undefined)

  if (!parsedFields || parsedFields.length === 0) {
    return null
  }

  return {
    id: sectionId,
    key: sectionId,
    label: (section.label as string) ?? sectionId,
    description: section.description as string | undefined,
    icon: section.icon as string | undefined,
    editInline: section.editInline as boolean | undefined,
    fields: parsedFields,
  }
}

export function parseSections(raw: Record<string, unknown>): SchemaSection[] {
  const sections: SchemaSection[] = []

  for (const [sectionKey, sectionValue] of Object.entries(raw)) {
    const section = parseSection(sectionKey, sectionValue)

    if (section) {
      sections.push(section)
    }
  }

  return sections
}
