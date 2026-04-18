<template>
  <div class="rounded-lg border border-default p-3">
    <div class="mb-3 text-sm font-medium text-highlighted">
      {{ field.label }}
    </div>

    <div class="flex flex-col gap-3">
      <EditorDynamicField
        v-for="subField in field.fields ?? []"
        :key="subField.key"
        :field="subField"
        :model-value="currentValue[subField.key]"
        @update:model-value="updateField(subField.key, $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

const currentValue = computed<Record<string, unknown>>(() => {
  if (props.modelValue && typeof props.modelValue === 'object') {
    return props.modelValue as Record<string, unknown>
  }

  return {}
})

function updateField(key: string, value: unknown) {
  emit('update:modelValue', {
    ...currentValue.value,
    [key]: value,
  })
}
</script>
