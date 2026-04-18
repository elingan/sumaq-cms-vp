<template>
  <USelectMenu
    v-if="isMultiple"
    :model-value="(modelValue as string[]) ?? []"
    :items="selectOptions"
    :placeholder="field.placeholder ?? t('editor.selectOption')"
    multiple
    @update:model-value="emit('update:modelValue', $event)"
  />
  <USelect
    v-else
    :model-value="(modelValue as string) ?? ''"
    :items="selectOptions"
    :placeholder="field.placeholder ?? t('editor.selectOption')"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { SchemaField, SelectOption } from '#shared/types/schema'

const { t } = useI18n()

interface Props {
  field: SchemaField
  modelValue?: unknown
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

const isMultiple = computed(() => {
  const options = props.field.options
  return !!options && !Array.isArray(options) && options.multiple === true
})

const selectOptions = computed(() => {
  const options = props.field.options

  if (Array.isArray(options)) {
    return options
  }

  if (options && Array.isArray(options.values)) {
    if (typeof options.values[0] === 'string') {
      return options.values as string[]
    }

    return (options.values as SelectOption[]).map((option) => ({
      label: option.label,
      value: option.value,
    }))
  }

  return []
})
</script>
