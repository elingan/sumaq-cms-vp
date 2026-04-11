<template>
  <UInput
    :model-value="modelValue as string"
    :placeholder="field.placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()
</script>
