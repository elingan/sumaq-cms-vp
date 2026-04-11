<template>
  <div class="flex flex-col gap-6">
    <UCard v-for="section in sections" :key="section.key">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon v-if="section.icon" :name="section.icon" class="size-5 text-primary" />
          <div>
            <h3 class="font-semibold text-base">
              {{ section.label }}
            </h3>
            <p v-if="section.description" class="text-sm text-muted">
              {{ section.description }}
            </p>
          </div>
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <DynamicField
          v-for="field in section.fields"
          :key="field.key"
          :field="field"
          :model-value="(formState[section.key] as Record<string, unknown>)?.[field.key]"
          :error="fieldError(section.key, field.key)"
          @update:model-value="updateField(section.key, field.key, $event)"
        />
      </div>
    </UCard>

    <div class="flex justify-end gap-3">
      <UButton :label="t('actions.save')" :loading="isSaving" @click="handleSubmit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SchemaSection } from '#shared/types/schema'

const { t } = useI18n()

interface Props {
  sections: SchemaSection[]
  modelValue?: Record<string, unknown>
  isSaving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  isSaving: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
  (e: 'submit', value: Record<string, unknown>): void
}>()

const errors = ref<Record<string, string>>({})

const formState = computed(() => props.modelValue ?? {})

function updateField(sectionKey: string, fieldKey: string, value: unknown) {
  const updated = {
    ...formState.value,
    [sectionKey]: {
      ...(formState.value[sectionKey] as Record<string, unknown>),
      [fieldKey]: value,
    },
  }
  emit('update:modelValue', updated)
}

function fieldError(sectionKey: string, fieldKey: string): string | undefined {
  return errors.value[`${sectionKey}.${fieldKey}`]
}

function handleSubmit() {
  errors.value = {}
  emit('submit', formState.value)
}
</script>
