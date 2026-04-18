import { z } from 'zod'

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
  label: string
  type: string
  options?: string[] | SelectOptionsConfig
  fields?: SchemaField[]
  [key: string]: any
}

export interface SchemaSection {
  id: string
  label: string
  description?: string
  fields?: SchemaField[]
}

/**
 * Convierte un tipo de esquema YAML a un esquema Zod
 */
function fieldTypeToZod(field: SchemaField, isNested: boolean = false): z.ZodTypeAny {
  switch (field.type) {
    case 'string':
      return isNested ? z.string().optional() : z.string().min(1, `${field.label} es requerido`)

    case 'text':
      return isNested ? z.string().optional() : z.string().min(1, `${field.label} es requerido`)

    case 'richtext':
      return isNested ? z.string().optional() : z.string().min(1, `${field.label} es requerido`)

    case 'number':
      return z.number().or(z.string().transform(Number))

    case 'date':
      return isNested ? z.string().optional() : z.string().min(1, `${field.label} es requerido`)

    case 'boolean':
      return z
        .boolean()
        .optional()
        .default(field.default ?? false)

    case 'url': {
      const isUrlOrRelativeAnchor = (value: string) => {
        if (typeof value !== 'string' || value.trim().length === 0) return false
        const v = value.trim()
        if (v.startsWith('#')) return true
        if (v.startsWith('/') || v.startsWith('./') || v.startsWith('../')) return true
        try {
          const u = new URL(v)
          return u.protocol === 'http:' || u.protocol === 'https:'
        } catch {
          // Aceptar rutas relativas simples como "about" o "blog/post"
          return /^[a-zA-Z0-9][a-zA-Z0-9\-._~/]*$/.test(v)
        }
      }

      const urlSchema = z
        .string()
        .refine(
          isUrlOrRelativeAnchor,
          `${field.label} debe ser una URL válida (http(s), relativa o ancla #) `,
        )

      return isNested ? urlSchema.optional() : urlSchema.min(1, `${field.label} es requerido`)
    }

    case 'image':
      return z.string().url(`${field.label} debe ser una URL de imagen válida`)

    case 'select': {
      // Support multiple formats:
      // 1. Legacy: options: ["value1", "value2"]
      // 2. New: options: { values: ["value1", "value2"] }
      // 3. New: options: { values: [{ value: "v1", label: "Label 1" }] }
      // 4. Multiple: options: { multiple: true, values: [...] }

      let validValues: string[] = []
      let isMultiple = false

      // Legacy format: direct array
      if (Array.isArray(field.options)) {
        validValues = field.options
      }
      // New format: options object with values
      else if (
        field.options &&
        typeof field.options === 'object' &&
        !Array.isArray(field.options)
      ) {
        isMultiple = field.options.multiple === true
        const values = field.options.values

        if (Array.isArray(values) && values.length > 0) {
          // Array of strings
          if (typeof values[0] === 'string') {
            validValues = values as string[]
          }
          // Array of objects with value/label
          else if (typeof values[0] === 'object' && 'value' in values[0]) {
            validValues = (values as SelectOption[]).map((opt) => opt.value)
          }
        }
      }

      // Create enum schema from valid values
      if (validValues.length > 0) {
        const enumSchema = z.enum(validValues as [string, ...string[]])
        // Multiple selection returns array
        if (isMultiple) {
          return isNested
            ? z.array(enumSchema).optional()
            : z.array(enumSchema).min(1, `Selecciona al menos un ${field.label}`)
        }
        return enumSchema
      }

      // Fallback to string if no valid options
      return z.string()
    }

    case 'object': {
      // Objeto con campos anidados
      if (field.fields?.length) {
        const objectSchema = z.object(
          field.fields.reduce(
            (acc, nestedField) => {
              // Los campos dentro de objetos heredan el estado nested
              acc[nestedField.id] = fieldTypeToZod(nestedField, true)
              return acc
            },
            {} as Record<string, z.ZodTypeAny>,
          ),
        )
        return isNested ? objectSchema.optional() : objectSchema
      }
      return z.object({}).optional()
    }

    case 'list': {
      // Lista con campos anidados
      if (field.fields?.length) {
        const nestedSchema = z.object(
          field.fields.reduce(
            (acc, nestedField) => {
              // Los campos dentro de listas son opcionales
              acc[nestedField.id] = fieldTypeToZod(nestedField, true)
              return acc
            },
            {} as Record<string, z.ZodTypeAny>,
          ),
        )
        // Array puede estar vacío
        return z.array(nestedSchema).optional().default([])
      }
      return z.array(z.any()).optional().default([])
    }

    case 'media': {
      // Media object con tipo (image/video) y campos anidados
      if (field.fields?.length) {
        const mediaSchema = z.object(
          field.fields.reduce(
            (acc, mediaField) => {
              // Los campos dentro de media también pueden ser opcionales si están anidados
              acc[mediaField.id] = fieldTypeToZod(mediaField, isNested)
              return acc
            },
            {} as Record<string, z.ZodTypeAny>,
          ),
        )
        return isNested ? mediaSchema.optional() : mediaSchema
      }
      return z.object({ type: z.string(), link: z.string().url() })
    }

    default:
      return z.string()
  }
}

/**
 * Crea un esquema Zod a partir de la estructura del YAML
 */
export function createZodSchemaFromFields(fields: SchemaField[]): z.ZodTypeAny {
  const schemaObj = fields.reduce(
    (acc, field) => {
      acc[field.id] = fieldTypeToZod(field)
      return acc
    },
    {} as Record<string, z.ZodTypeAny>,
  )

  return z.object(schemaObj)
}

/**
 * Composable para validar datos usando esquema dinámico
 */
export const useSchemaValidator = (schema: SchemaField[] | z.ZodTypeAny) => {
  let zodSchema: z.ZodTypeAny

  // Convertir schema a Zod si es necesario
  if (Array.isArray(schema)) {
    zodSchema = createZodSchemaFromFields(schema)
  } else {
    // Si es un objeto, asumir que ya es un esquema Zod
    zodSchema = schema as z.ZodTypeAny
  }

  const validate = async (data: any) => {
    try {
      const result = await zodSchema.parseAsync(data)
      return { success: true, data: result, errors: null }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as any
        const errors: Record<string, string[]> = {}
        zodError.issues?.forEach((issue: any) => {
          const path = issue.path.join('.')
          if (!errors[path]) {
            errors[path] = []
          }
          errors[path].push(issue.message)
        })
        return { success: false, data: null, errors }
      }
      return { success: false, data: null, errors: { general: ['Error desconocido'] } }
    }
  }

  const getFieldError = (fieldPath: string, errors: Record<string, string[]> | null) => {
    if (!errors) return null
    return errors[fieldPath]?.[0] || null
  }

  return {
    validate,
    getFieldError,
    schema: zodSchema,
  }
}
