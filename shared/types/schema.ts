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
  required?: boolean
  description?: string
  placeholder?: string
  options?: string[] | SelectOptionsConfig
  fields?: SchemaField[]
}

export interface SchemaSection {
  id: string
  key: string
  label: string
  description?: string
  icon?: string
  fields: SchemaField[]
}
