<template>
  <div class="space-y-2">
    <label :for="field.id" class="block text-sm font-medium text-gray-700">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-red-500">*</span>
    </label>
    <UInput
      :id="field.id"
      type="date"
      :model-value="modelValue"
      :placeholder="field.placeholder || 'YYYY-MM-DD'"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <p v-if="field.description" class="text-xs text-gray-500">
      {{ field.description }}
    </p>
    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '~/composables/useSchemaValidator'

defineProps<{
  field: SchemaField
  modelValue: string
  error?: string | null
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
