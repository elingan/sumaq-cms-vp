<template>
  <div class="flex flex-col gap-2">
    <UInput
      type="url"
      :model-value="modelValue as string"
      :placeholder="field.placeholder ?? 'https://'"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <img
      v-if="modelValue"
      :src="modelValue as string"
      alt="Preview"
      class="max-h-32 rounded-md object-contain border border-default"
    />
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()
</script>
