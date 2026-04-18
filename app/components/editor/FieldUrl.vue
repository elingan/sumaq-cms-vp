<template>
  <UInput
    type="url"
    :model-value="String(modelValue ?? '')"
    :placeholder="field.placeholder ?? 'https://'"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()
</script>
