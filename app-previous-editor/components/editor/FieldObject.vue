<template>
  <div class="border border-gray-300 rounded-lg p-4 space-y-4 bg-gray-50">
    <div class="flex items-center gap-2 pb-2 border-b border-gray-200">
      <Icon name="i-lucide-box" class="text-gray-600 w-4 h-4" />
      <h4 class="font-semibold text-sm text-gray-700">{{ field.label }}</h4>
    </div>

    <template v-if="field.fields">
      <div v-for="nestedField in field.fields" :key="nestedField.id" class="space-y-1">
        <!-- Validación: Field sin type -->
        <div v-if="!nestedField.type" class="p-4 bg-red-50 border border-red-200 rounded-md">
          <div class="flex items-start gap-2">
            <Icon name="i-lucide-x-circle" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-red-800">
              <p class="font-medium">
                El campo "{{ nestedField.label || nestedField.id }}" no tiene definida la propiedad
                <code class="bg-red-100 px-1 rounded">type</code>
              </p>
              <p class="text-red-700 mt-1">Debe especificar el tipo de campo en el schema.</p>
            </div>
          </div>
        </div>

        <template v-else>
          <label class="block text-sm font-medium">{{ nestedField.label }}</label>

          <!-- Renderizar campo anidado recursivamente -->
          <EditorDynamicField
            :field="nestedField"
            :model-value="currentValue[nestedField.id]"
            :error="getNestedError(nestedField.id)"
            :errors="errors"
            @update:model-value="updateNestedField(nestedField.id, $event)"
          />
        </template>
      </div>
    </template>

    <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '~/composables/useSchemaValidator'
import DynamicField from '~/components/Editor/DynamicField.vue'

const props = defineProps<{
  field: SchemaField
  modelValue: Record<string, any>
  error?: string | null
  errors?: Record<string, string[]> | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

// Asegurar que currentValue siempre sea un objeto
const currentValue = computed(() => {
  return props.modelValue || {}
})

const updateNestedField = (fieldId: string, value: any): void => {
  const updated = { ...currentValue.value, [fieldId]: value }
  emit('update:modelValue', updated)
}

const getNestedError = (fieldId: string): string | null => {
  if (!props.errors) return null
  const errorKey = `${props.field.id}.${fieldId}`
  return props.errors[errorKey]?.[0] || null
}
</script>
