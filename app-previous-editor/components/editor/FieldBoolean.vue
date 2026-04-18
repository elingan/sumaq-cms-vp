<template>
  <div class="space-y-2">
    <label class="flex items-center gap-3 cursor-pointer">
      <UToggle :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" />
      <div>
        <span class="text-sm font-medium text-gray-700">{{ field.label }}</span>
        <p v-if="field.description" class="text-xs text-gray-500 mt-0.5">
          {{ field.description }}
        </p>
      </div>
    </label>
    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '~/composables/useSchemaValidator'

defineProps<{
  field: SchemaField
  modelValue: boolean
  error?: string | null
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
