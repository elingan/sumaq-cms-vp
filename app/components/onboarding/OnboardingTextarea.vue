<template>
  <UFormField :label="field.label" :required="field.required" :hint="field.hint">
    <div class="relative">
      <UTextarea
        :id="`field-${field.key}`"
        :model-value="modelValue"
        :placeholder="field.placeholder"
        :rows="5"
        size="lg"
        class="w-full"
        @update:model-value="update"
      />
      <div class="absolute right-2 bottom-2 flex items-center gap-0.5">
        <UButton
          v-if="speech.isSupported.value"
          :icon="speech.isListening.value ? 'i-lucide-mic-off' : 'i-lucide-mic'"
          :color="speech.isListening.value ? 'error' : 'neutral'"
          variant="ghost"
          size="xs"
          square
          :aria-label="$t('onboarding.dictate')"
          @click="handleDictation"
        />
        <UButton
          :icon="ai.isPolishing.value ? 'i-lucide-loader-circle' : 'i-lucide-sparkles'"
          :class="{ 'animate-spin': ai.isPolishing.value }"
          :disabled="ai.isPolishing.value || !modelValue?.trim()"
          color="amber"
          variant="ghost"
          size="xs"
          square
          :aria-label="$t('onboarding.polish')"
          @click="handlePolish"
        />
      </div>
    </div>
    <p v-if="speech.isListening.value" class="text-xs text-error-500 mt-1 animate-pulse">
      {{ $t('onboarding.listening') }}...
    </p>
    <p
      v-if="ai.polishedText.value && ai.polishedText.value !== modelValue"
      class="text-xs text-amber-600 dark:text-amber-400 mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-md"
    >
      <span class="font-medium">{{ $t('onboarding.aiSuggestion') }}:</span>
      <span class="mx-2 text-slate-600 dark:text-slate-300"
        >{{ ai.polishedText.value.slice(0, 120)
        }}{{ ai.polishedText.value.length > 120 ? '...' : '' }}</span
      >
      <UButton
        variant="link"
        size="xs"
        class="text-xs"
        :label="$t('onboarding.apply')"
        @click="applyPolish"
      />
    </p>
  </UFormField>
</template>

<script setup lang="ts">
import type { OnboardingFieldDef } from '~/composables/useOnboarding'

const props = defineProps<{
  field: OnboardingFieldDef
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const speech = useSpeechRecognition()
const ai = useAIPolish()
const { locale } = useI18n()

watch(speech.transcript, (value) => {
  if (value) {
    const current = props.modelValue || ''
    update(current + (current ? ' ' : '') + value)
    speech.transcript.value = ''
  }
})

function update(value: string) {
  emit('update:modelValue', value)
}

function handleDictation() {
  speech.toggle(`#field-${props.field.key}`)
}

async function handlePolish() {
  try {
    const polished = await ai.polish(props.modelValue, props.field.key, locale.value)
    ai.polishedText.value = polished
  } catch {
    // error handled in composable
  }
}

function applyPolish() {
  if (ai.polishedText.value) {
    update(ai.polishedText.value)
    ai.polishedText.value = null
  }
}
</script>
