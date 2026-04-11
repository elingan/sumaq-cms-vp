<template>
  <UInput
    type="number"
    :model-value="String(modelValue ?? '')"
    :placeholder="field.placeholder"
    @update:model-value="emit('update:modelValue', $event === '' ? null : Number($event))"
  />
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
}

withDefaults(defineProps<Props>(), {
  modelValue: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()
</script>
