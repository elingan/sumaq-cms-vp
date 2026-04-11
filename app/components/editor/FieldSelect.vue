<template>
  <USelect
    :model-value="modelValue as string"
    :items="field.options ?? []"
    :placeholder="field.placeholder ?? t('editor.selectOption')"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

const { t } = useI18n()

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
