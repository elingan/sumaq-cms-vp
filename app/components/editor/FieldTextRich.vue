<template>
  <UEditor
    :model-value="String(modelValue ?? '')"
    content-type="html"
    :placeholder="field.placeholder ?? `Escribe ${field.label.toLowerCase()}...`"
    class="min-h-56"
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
