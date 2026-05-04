<template>
  <div
    class="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10"
  >
    <div class="max-w-4xl mx-auto px-4 py-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ $t('onboarding.step') }} {{ current + 1 }} / {{ total }}
        </span>
        <span class="text-xs font-medium text-primary-500 dark:text-primary-400 tabular-nums">
          {{ percent }}%
        </span>
      </div>

      <UProgress :model-value="percent" color="primary" size="sm" :animation="true" />

      <div class="flex items-center justify-center gap-0.5 mt-3 flex-wrap">
        <button
          v-for="(label, i) in stepLabels"
          :key="i"
          class="group flex flex-col items-center gap-0.5 px-1 py-0.5 rounded transition-colors cursor-pointer min-w-0"
          :class="[
            i === current
              ? 'text-primary-600 dark:text-primary-400 cursor-default'
              : completedSections.includes(i)
                ? 'text-slate-600 dark:text-slate-300 hover:text-primary-500 dark:hover:text-primary-400'
                : 'text-slate-400 dark:text-slate-600',
          ]"
          :disabled="i !== current && !completedSections.includes(i) && i > current"
          :title="label"
          @click="$emit('goTo', i)"
        >
          <span
            class="rounded-full transition-all flex-shrink-0"
            :class="[
              i === current
                ? 'w-3 h-3 bg-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                : completedSections.includes(i)
                  ? 'w-2.5 h-2.5 bg-primary-400 dark:bg-primary-500'
                  : 'w-2 h-2 bg-slate-300 dark:bg-slate-600',
            ]"
          />
          <span class="text-[10px] leading-tight hidden sm:block truncate max-w-16">
            {{ label }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  current: number
  total: number
  percent: number
  completedSections: number[]
  stepLabels: string[]
}>()

defineEmits<{
  goTo: [index: number]
}>()
</script>
