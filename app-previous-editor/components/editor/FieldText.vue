<template>
  <div class="space-y-2">
    <UTextarea
      :model-value="modelValue"
      :placeholder="`Escribe ${field.label.toLowerCase()}...`"
      :rows="5"
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
