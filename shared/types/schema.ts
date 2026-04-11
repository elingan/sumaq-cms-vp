export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'select'
  | 'url'
  | 'image'
  | 'list'
  | 'boolean'
  | 'date'
  | 'object'

export interface SchemaField {
  id: string
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  options?: string[]
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
