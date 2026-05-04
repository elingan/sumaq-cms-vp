<template>
  <UPage>
    <UContainer>
      <div class="max-w-lg mx-auto text-center py-16">
        <UIcon name="i-lucide-check-circle" class="size-16 text-green-500 mx-auto mb-6" />

        <h1 class="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white mb-4">
          {{ $t('onboarding.completeTitle') }}
        </h1>

        <p class="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          {{ $t('onboarding.completeDescription') }}
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <UButton
            :label="$t('onboarding.goToDashboard')"
            icon="i-lucide-layout-dashboard"
            size="lg"
            to="/dashboard"
          />
          <UButton
            :label="$t('onboarding.reviewResponses')"
            variant="outline"
            size="lg"
            icon="i-lucide-file-text"
            @click="showJson = !showJson"
          />
        </div>

        <pre
          v-if="showJson"
          class="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left text-xs overflow-auto max-h-96"
          >{{ JSON.stringify(responseData, null, 2) }}</pre
        >
      </div>
    </UContainer>
  </UPage>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', title: 'Onboarding Complete' })

const showJson = ref(false)
const responseData = ref<Record<string, any>>({})

onMounted(async () => {
  try {
    const existing = await $fetch('/api/onboarding')
    if (existing) {
      responseData.value = (existing as any).content || {}
    }
  } catch {
    // no data
  }
})
</script>
