<template>
  <div class="space-y-6">
    <UCard class="shadow-sm">
      <div class="space-y-1 mb-6">
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
          {{ section.title }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ section.description }}
        </p>
      </div>

      <div class="space-y-5">
        <template v-for="field in section.fields" :key="field.key">
          <OnboardingTextField
            v-if="field.type === 'text'"
            :field="field"
            :model-value="(formData[field.key] as string) || ''"
            @update:model-value="updateField(field.key, $event)"
          />

          <OnboardingTextarea
            v-else-if="field.type === 'textarea'"
            :field="field"
            :model-value="(formData[field.key] as string) || ''"
            @update:model-value="updateField(field.key, $event)"
          />

          <UFormField
            v-else-if="field.type === 'select'"
            :label="field.label"
            :required="field.required"
          >
            <USelect
              :model-value="(formData[field.key] as string) || ''"
              :items="field.options"
              :placeholder="field.placeholder"
              size="lg"
              @update:model-value="updateField(field.key, $event)"
            />
          </UFormField>

          <UFormField
            v-else-if="field.type === 'number'"
            :label="field.label"
            :required="field.required"
            :hint="field.hint"
          >
            <UInput
              :model-value="String(formData[field.key] || '')"
              :placeholder="field.placeholder"
              type="number"
              size="lg"
              @update:model-value="updateField(field.key, Number($event))"
            />
          </UFormField>

          <UFormField v-else-if="field.type === 'checkbox'" :label="field.label" :hint="field.hint">
            <UCheckbox
              :model-value="(formData[field.key] as boolean) || false"
              :label="field.options?.[0]?.label"
              @update:model-value="updateField(field.key, $event)"
            />
          </UFormField>

          <UFormField
            v-else-if="field.type === 'checkbox-group'"
            :label="field.label"
            :hint="field.hint"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <UCheckbox
                v-for="option in field.options"
                :key="option.value"
                :model-value="((formData[field.key] as string[]) || []).includes(option.value)"
                :label="option.label"
                @update:model-value="toggleCheckbox(field.key, option.value, $event)"
              />
            </div>
          </UFormField>

          <UFormField
            v-else-if="field.type === 'dynamic-list'"
            :label="field.label"
            :hint="field.hint"
          >
            <div class="space-y-2">
              <div
                v-for="(item, i) in (formData[field.key] as string[]) || []"
                :key="i"
                class="flex items-center gap-2"
              >
                <UInput
                  :model-value="item"
                  :placeholder="field.placeholder"
                  size="md"
                  class="flex-1"
                  @update:model-value="updateListItem(field.key, i, $event)"
                />
                <UButton
                  icon="i-lucide-x"
                  variant="ghost"
                  size="xs"
                  square
                  color="neutral"
                  @click="removeListItem(field.key, i)"
                />
              </div>
              <UButton
                icon="i-lucide-plus"
                variant="outline"
                size="xs"
                :label="$t('onboarding.add')"
                @click="addListItem(field.key)"
              />
            </div>
          </UFormField>

          <UFormField
            v-else-if="field.type === 'dynamic-url-list'"
            :label="field.label"
            :hint="field.hint"
          >
            <div class="space-y-2">
              <div
                v-for="(item, i) in (formData[field.key] as string[]) || []"
                :key="i"
                class="flex items-center gap-2"
              >
                <UInput
                  :model-value="item"
                  :placeholder="field.placeholder"
                  type="url"
                  size="md"
                  class="flex-1"
                  @update:model-value="updateListItem(field.key, i, $event)"
                />
                <UButton
                  icon="i-lucide-x"
                  variant="ghost"
                  size="xs"
                  square
                  color="neutral"
                  @click="removeListItem(field.key, i)"
                />
              </div>
              <UButton
                icon="i-lucide-plus"
                variant="outline"
                size="xs"
                :label="$t('onboarding.addLink')"
                @click="addListItem(field.key)"
              />
            </div>
          </UFormField>

          <OnboardingFileUpload
            v-else-if="field.type === 'file' || field.type === 'multi-file'"
            :field="field"
            :model-value="(formData[field.key] as string[]) || []"
            @update:model-value="updateField(field.key, $event)"
          />
        </template>
      </div>
    </UCard>

    <div class="flex items-center justify-between">
      <UButton
        v-if="canGoBack"
        variant="ghost"
        icon="i-lucide-chevron-left"
        :label="$t('onboarding.back')"
        @click="$emit('prev')"
      />

      <div class="flex-1" />

      <UButton
        :label="isLast ? $t('onboarding.finish') : $t('onboarding.next')"
        :icon="isLast ? 'i-lucide-check' : 'i-lucide-chevron-right'"
        icon-position="right"
        :loading="isSaving"
        size="lg"
        @click="$emit('next')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OnboardingSectionDef } from '~/composables/useOnboarding'

const props = defineProps<{
  section: OnboardingSectionDef
  formData: Record<string, any>
  isSaving: boolean
  canGoBack: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  'update:formData': [key: string, value: any]
  prev: []
  next: []
}>()

function updateField(key: string, value: any) {
  emit('update:formData', key, value)
}

function addListItem(key: string) {
  const arr = [...((props.formData[key] as string[]) || []), '']
  updateField(key, arr)
}

function updateListItem(key: string, index: number, value: string) {
  const arr = [...(props.formData[key] as string[])]
  arr[index] = value
  updateField(key, arr)
}

function removeListItem(key: string, index: number) {
  const arr = [...(props.formData[key] as string[])]
  arr.splice(index, 1)
  updateField(key, arr)
}

function toggleCheckbox(key: string, value: string, checked: boolean) {
  const arr = [...((props.formData[key] as string[]) || [])]
  if (checked) {
    arr.push(value)
  } else {
    const idx = arr.indexOf(value)
    if (idx >= 0) arr.splice(idx, 1)
  }
  updateField(key, arr)
}
</script>
