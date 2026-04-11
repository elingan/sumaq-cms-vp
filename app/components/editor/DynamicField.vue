<template>
  <UFormField :label="field.label" :error="error" :required="field.required">
    <FieldString
      v-if="field.type === 'string'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldText
      v-else-if="field.type === 'text'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldNumber
      v-else-if="field.type === 'number'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldSelect
      v-else-if="field.type === 'select'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldUrl
      v-else-if="field.type === 'url'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldImage
      v-else-if="field.type === 'image'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldBoolean
      v-else-if="field.type === 'boolean'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldDate
      v-else-if="field.type === 'date'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldList
      v-else-if="field.type === 'list'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FieldObject
      v-else-if="field.type === 'object'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else
      :model-value="String(modelValue ?? '')"
      :placeholder="field.placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
  error?: string
}

withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  error: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()
</script>
