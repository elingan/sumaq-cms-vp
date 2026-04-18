<template>
  <div class="space-y-8 max-w-4xl">
    <!-- Renderizar todas las secciones dinámicamente -->
    <UCard v-for="(section, sectionKey) in schema" :key="sectionKey">
      <template #header>
        <div class="flex items-center gap-2">
          <Icon name="i-lucide-layout-panel-left" class="w-5 h-5" />
          <div>
            <h2 class="font-semibold text-lg">{{ section.label }}</h2>
            <p v-if="section.description" class="text-sm text-gray-500">
              {{ section.description }}
            </p>
          </div>
        </div>
      </template>
      <div class="space-y-4">
        <!-- Validación: Sección sin fields -->
        <div
          v-if="!section.fields || section.fields.length === 0"
          class="p-4 bg-yellow-50 border border-yellow-200 rounded-md"
        >
          <div class="flex items-start gap-2">
            <Icon
              name="i-lucide-alert-triangle"
              class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
            />
            <div class="text-sm text-yellow-800">
              <p class="font-medium">Esta sección no tiene campos definidos</p>
              <p class="text-yellow-700 mt-1">
                Debe agregar la propiedad <code class="bg-yellow-100 px-1 rounded">fields</code> al
                schema de esta sección.
              </p>
            </div>
          </div>
        </div>

        <!-- Renderizar campos de la sección -->
        <template v-else>
          <div v-for="field in section.fields" :key="field.id" class="space-y-1">
            <!-- Validación: Field sin type -->
            <div v-if="!field?.type" class="p-4 bg-red-50 border border-red-200 rounded-md">
              <div class="flex items-start gap-2">
                <Icon name="i-lucide-x-circle" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div class="text-sm text-red-800">
                  <p class="font-medium">
                    El campo "{{ field.label || field.id }}" no tiene definida la propiedad
                    <code class="bg-red-100 px-1 rounded">type</code>
                  </p>
                  <p class="text-red-700 mt-1">Debe especificar el tipo de campo en el schema.</p>
                </div>
              </div>
            </div>

            <template v-else>
              <label class="block text-sm font-medium">{{ field.label }}</label>

              <!-- Campo tipo list anidado -->
              <FieldList
                v-if="field.type === 'list'"
                :field="field"
                :model-value="formState[sectionKey]?.[field.id] || []"
                :errors="validationErrors"
                @update:model-value="updateField([sectionKey, field.id], $event)"
              />

              <!-- Otros tipos de campos -->
              <EditorDynamicField
                v-else
                :field="field"
                :model-value="formState[sectionKey]?.[field.id]"
                :error="getFieldError(`${sectionKey}.${field.id}`)"
                :errors="validationErrors"
                :preview="field?.type === 'image'"
                @update:model-value="updateField([sectionKey, field?.id], $event)"
              />
            </template>
          </div>
        </template>
      </div>
    </UCard>

    <!-- Actions -->
    <div class="flex gap-3 sticky bottom-0 bg-white p-4 border-t border-gray-300 rounded-lg">
      <UButton icon="i-lucide-save" :loading="isSaving" @click="saveChanges">
        Guardar cambios
      </UButton>
      <UButton variant="ghost" icon="i-lucide-refresh-cw" @click="resetForm">
        Descartar cambios
      </UButton>
      <div v-if="successMessage" class="flex items-center gap-2 text-green-600 text-sm">
        <Icon name="i-lucide-check" />
        {{ successMessage }}
      </div>
      <div v-if="resetMessage" class="flex items-center gap-2 text-blue-600 text-sm">
        <Icon name="i-lucide-rotate-ccw" />
        {{ resetMessage }}
      </div>
      <div
        v-if="validationErrors && Object.keys(validationErrors).length > 0"
        class="flex items-center gap-2 text-red-600 text-sm"
      >
        <Icon name="i-lucide-alert-circle" />
        Hay {{ Object.keys(validationErrors).length }} error(es) en el formulario:
        {{ errorDetails.join('; ') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import type { SchemaField, SchemaSection } from '~/composables/useSchemaValidator'
import { createZodSchemaFromFields } from '~/composables/useSchemaValidator'
import DynamicField from '~/components/Editor/DynamicField.vue'
import FieldList from '~/components/Editor/FieldList.vue'
import { z } from 'zod'

const props = defineProps<{
  schema: Record<string, SchemaSection>
  initialData: Record<string, any>
  onSave?: (data: Record<string, any>) => Promise<void>
}>()

// Inicializar formState con estructura base del schema + datos iniciales
const initializeFormState = () => {
  const baseState: Record<string, any> = {}

  // Crear estructura base para cada sección
  Object.keys(props.schema).forEach((sectionKey) => {
    baseState[sectionKey] = {}
  })

  // Sobrescribir con datos iniciales si existen
  Object.assign(baseState, props.initialData)

  return baseState
}

const formState = reactive(initializeFormState())
const validationErrors = ref<Record<string, string[]> | null>(null)
const isSaving = ref(false)
const successMessage = ref('')
const resetMessage = ref('')

// Crear esquema de validación completo
const validationSchema = computed(() => {
  const schemaFields: Record<string, z.ZodTypeAny> = {}

  Object.entries(props.schema).forEach(([sectionKey, section]) => {
    if (section.fields) {
      // Todas las secciones tienen campos normales
      schemaFields[sectionKey] = createZodSchemaFromFields(section.fields)
    }
  })

  return z.object(schemaFields)
})

const updateField = (path: string[], value: any): void => {
  if (path.length === 0) return

  let current: any = formState

  // Navegar hasta el penúltimo nivel
  for (let i = 0; i < path.length - 1; i++) {
    const key: string = path[i]!
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key] as Record<string, any>
  }

  // Establecer el valor en la última clave
  const lastKey: string = path[path.length - 1]!
  current[lastKey] = value
}

const getFieldError = (fieldPath: string): string | null => {
  if (!validationErrors.value) return null
  return validationErrors.value[fieldPath]?.[0] || null
}

// Añade el campo 'order' a todos los items de listas
const addOrderToLists = (data: Record<string, any>) => {
  const processedData = JSON.parse(JSON.stringify(data))

  Object.entries(props.schema).forEach(([sectionKey, section]) => {
    // Campos tipo list anidados dentro de secciones
    if (section.fields && processedData[sectionKey]) {
      section.fields.forEach((field: SchemaField) => {
        if (field.type === 'list' && Array.isArray(processedData[sectionKey]?.[field.id])) {
          processedData[sectionKey][field.id] = processedData[sectionKey][field.id].map(
            (item: any, index: number) => ({
              ...item,
              order: index,
            }),
          )
        }
      })
    }
  })

  return processedData
}

const saveChanges = async () => {
  isSaving.value = true
  successMessage.value = ''
  validationErrors.value = null

  try {
    // Validar datos antes de guardar
    const result = await validationSchema.value.safeParseAsync(formState)

    if (!result.success) {
      // Mapear errores de Zod a formato de errores
      const errors: Record<string, string[]> = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.')
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(issue.message)
      })
      validationErrors.value = errors

      // Mostrar mensaje de error
      successMessage.value = ''
      throw new Error('Por favor corrige los errores antes de guardar')
    }

    // Añadir campo 'order' a todos los items de listas
    const dataWithOrder = addOrderToLists(result.data)

    if (props.onSave) {
      await props.onSave(dataWithOrder)
      validationErrors.value = null
      successMessage.value = '¡Cambios guardados exitosamente!'
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al guardar'
    if (!validationErrors.value) {
      // Solo mostrar error genérico si no hay errores de validación
      console.error('Error guardando cambios:', error)
    }
  } finally {
    isSaving.value = false
  }
}

const resetForm = () => {
  const resetData = initializeFormState()
  Object.keys(formState).forEach((key) => delete formState[key])
  Object.assign(formState, resetData)
  validationErrors.value = null
  successMessage.value = ''
  resetMessage.value = '¡Cambios descartados!'
  setTimeout(() => {
    resetMessage.value = ''
  }, 3000)
}

// Genera descripciones legibles de los errores por campo
const errorDetails = computed(() => {
  if (!validationErrors.value) return [] as string[]

  const details: string[] = []

  const getLabelFromArray = (arr: SchemaField[] | undefined, id: string) => {
    const field = arr?.find((f) => f.id === id)
    return field?.label ?? id
  }

  Object.entries(validationErrors.value).forEach(([path]) => {
    const segments = path.split('.')
    const sectionKey = segments[0]!
    const section = props.schema[sectionKey]

    if (!section) {
      details.push(path)
      return
    }

    // Sección tipo list (ej: navigation)
    if (section.type === 'list') {
      const index = Number(segments[1])
      const fieldId = segments[2]
      const fieldLabel = getLabelFromArray(section.fields || [], fieldId!)
      details.push(`${section.label} → Ítem ${isNaN(index) ? '?' : index + 1} → ${fieldLabel}`)
      return
    }

    // Sección con campos normales
    if (section.fields) {
      const fieldId = segments[1]
      const field = section.fields.find((f) => f.id === fieldId)

      if (!field) {
        details.push(`${section.label} → ${fieldId}`)
        return
      }

      // Campo tipo list anidado
      if (field.type === 'list' && segments[2] !== undefined) {
        const index = Number(segments[2])
        const nestedFieldId = segments[3]
        const nestedLabel = getLabelFromArray(field.fields || [], nestedFieldId!)
        details.push(
          `${section.label} → ${field.label} → Ítem ${isNaN(index) ? '?' : index + 1} → ${nestedLabel}`,
        )
        return
      }

      // Campo simple
      details.push(`${section.label} → ${field.label}`)
      return
    }

    // Fallback
    details.push(path)
  })

  return details
})
</script>
