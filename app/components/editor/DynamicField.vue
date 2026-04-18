<template>
  <UFormField :label="field.label" :error="error" :required="field.required">
    <EditorFieldString
      v-if="field.type === 'string'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldText
      v-else-if="field.type === 'text'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldTextRich
      v-else-if="field.type === 'richtext'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldNumber
      v-else-if="field.type === 'number'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldSelect
      v-else-if="field.type === 'select'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldUrl
      v-else-if="field.type === 'url'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldImage
      v-else-if="field.type === 'image' || field.type === 'video'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldMedia
      v-else-if="field.type === 'media'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldBoolean
      v-else-if="field.type === 'boolean'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldDate
      v-else-if="field.type === 'date'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldList
      v-else-if="field.type === 'list'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <EditorFieldObject
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
