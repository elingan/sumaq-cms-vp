export type FieldType =
  | 'string'
  | 'text'
  | 'richtext'
  | 'number'
  | 'select'
  | 'url'
  | 'image'
  | 'video'
  | 'media'
  | 'list'
  | 'boolean'
  | 'date'
  | 'object'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectOptionsConfig {
  values?: string[] | SelectOption[]
  multiple?: boolean
}

export interface SchemaField {
  id: string
  key: string
  label: string
  type: FieldType
  fieldId?: string
  required?: boolean
  description?: string
  helpText?: string
  placeholder?: string
  editableIn?: 'form' | 'contextual' | 'both'
  options?: string[] | SelectOptionsConfig
  fields?: SchemaField[]
}

export interface SchemaSection {
  id: string
  key: string
  label: string
  description?: string
  icon?: string
  editInline?: boolean
  fields: SchemaField[]
}

export type SchemaFieldValue = unknown

export type SectionFormState = Record<string, SchemaFieldValue>

export type FormState = Record<string, SectionFormState>
