<template>
  <div class="flex flex-col gap-4 pl-4 border-l-2 border-default">
    <template v-for="subField in field.fields" :key="subField.key">
      <EditorDynamicField
        :field="subField"
        :model-value="(modelValue as Record<string, unknown>)?.[subField.key]"
        :error="errors?.[subField.key]"
        @update:model-value="handleUpdate(subField.key, $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
  errors?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  errors: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

function handleUpdate(key: string, value: unknown) {
  emit('update:modelValue', {
    ...(props.modelValue as Record<string, unknown>),
    [key]: value,
  })
}
</script>
