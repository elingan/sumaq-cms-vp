<template>
  <div>
    <UTextarea
      :model-value="modelValue"
      :placeholder="field.label"
      :rows="5"
      :error="!!error"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <p v-if="error" class="text-red-500 text-sm mt-1">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '~/composables/useSchemaValidator'

defineProps<{
  field: SchemaField
  modelValue: any
  error?: string | null
}>()

defineEmits<{
  'update:modelValue': [value: any]
}>()
</script>
