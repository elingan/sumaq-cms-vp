<template>
  <div class="space-y-3 border border-gray-300 rounded-lg p-4">
    <h4 class="font-semibold">{{ field.label }}</h4>

    <template v-if="field.fields">
      <div v-for="nestedField in field.fields" :key="nestedField.id" class="space-y-1">
        <label class="block text-sm font-medium">{{ nestedField.label }}</label>
        <EditorDynamicField
          :field="nestedField"
          :model-value="modelValue[nestedField.id]"
          :error="getNestedError(nestedField.id)"
          :preview="preview"
          @update:model-value="updateMediaField(nestedField.id, $event)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '~/composables/useSchemaValidator'
import DynamicField from '~/components/Editor/DynamicField.vue'

const props = defineProps<{
  field: SchemaField
  modelValue: any
  errors?: Record<string, string[]> | null
  preview?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const updateMediaField = (fieldId: string, value: any) => {
  const updated = { ...props.modelValue, [fieldId]: value }
  emit('update:modelValue', updated)
}

const getNestedError = (fieldId: string) => {
  if (!props.errors) return null
  return props.errors[fieldId]?.[0] || null
}
</script>
