<template>
  <UInput
    type="number"
    :model-value="String(modelValue ?? '')"
    :placeholder="field.placeholder"
    @update:model-value="emit('update:modelValue', $event === '' ? undefined : Number($event))"
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
