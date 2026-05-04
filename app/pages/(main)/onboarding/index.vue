<template>
  <UPage>
    <div>
      <OnboardingProgress
        :current="currentSection"
        :total="sections.length"
        :percent="completionPercent"
        :completed-sections="completedSections"
        :step-labels="stepLabels"
        @go-to="goToSection"
      />

      <div class="max-w-3xl mx-auto px-4 py-8">
        <Transition name="slide-fade" mode="out-in">
          <OnboardingSection
            :key="currentSection"
            v-if="currentSectionDef"
            :section="currentSectionDef"
            :form-data="formData"
            :is-saving="isSaving"
            :can-go-back="currentSection > 0"
            :is-last="currentSection === sections.length - 1"
            @update:form-data="updateField"
            @prev="prevSection"
            @next="nextSection"
          />
        </Transition>
      </div>
    </div>
  </UPage>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', title: 'Onboarding' })

const router = useRouter()
const sections = useOnboardingSections()

const currentSection = ref(0)
const formData = ref<Record<string, any>>({})
const isSaving = ref(false)
const completedSections = ref<number[]>([])

const currentSectionDef = computed(() => sections.value[currentSection.value])

const stepLabels = computed(() => sections.value.map((s) => s.title))

const completionPercent = computed(() => {
  return Math.round((completedSections.value.length / sections.value.length) * 100)
})

onMounted(async () => {
  try {
    const existing = await $fetch('/api/onboarding')

    if (existing) {
      const data = existing as {
        content: Record<string, Record<string, any>>
        completedSections: number[]
        isComplete: boolean
      }

      const merged: Record<string, any> = {}

      if (data.content) {
        for (const [, sectionData] of Object.entries(data.content)) {
          if (sectionData && typeof sectionData === 'object') {
            Object.assign(merged, sectionData)
          }
        }
      }

      formData.value = merged

      if (data.completedSections?.length > 0) {
        completedSections.value = data.completedSections
        const lastComplete = Math.max(...data.completedSections)
        currentSection.value = Math.min(lastComplete + 1, sections.value.length - 1)
      }

      if (data.isComplete) {
        router.replace('/onboarding/complete')
      }
    }
  } catch {
    // Start fresh
  }
})

function goToSection(index: number) {
  if (completedSections.value.includes(index) || index < currentSection.value) {
    currentSection.value = index
  }
}

function updateField(key: string, value: any) {
  formData.value[key] = value
}

async function collectSectionData(): Promise<Record<string, any>> {
  const sectionFields = currentSectionDef.value?.fields || []
  const data: Record<string, any> = {}

  for (const field of sectionFields) {
    if (formData.value[field.key] !== undefined) {
      data[field.key] = formData.value[field.key]
    }
  }

  return data
}

async function nextSection() {
  const sectionData = await collectSectionData()
  isSaving.value = true

  try {
    const result = await $fetch<{ isComplete: boolean; completedSections: number[] }>(
      '/api/onboarding',
      {
        method: 'POST',
        body: { section: currentSection.value, data: sectionData },
      },
    )

    completedSections.value = result.completedSections

    if (currentSection.value < sections.value.length - 1) {
      currentSection.value++
    } else if (result.isComplete) {
      router.replace('/onboarding/complete')
    }
  } catch {
    // stay on page
  } finally {
    isSaving.value = false
  }
}

function prevSection() {
  if (currentSection.value > 0) {
    currentSection.value--
  }
}
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.25s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.15s ease-in;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
