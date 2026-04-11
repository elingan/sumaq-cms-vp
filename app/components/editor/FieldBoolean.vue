<template>
  <USwitch
    :model-value="Boolean(modelValue)"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()
</script>
