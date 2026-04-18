<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-900">
    <div
      class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800"
    >
      <h3 class="text-lg font-semibold">Preview</h3>
      <div class="flex gap-2">
        <UButton
          :variant="viewMode === 'desktop' ? 'solid' : 'ghost'"
          icon="i-lucide-monitor"
          size="sm"
          @click="viewMode = 'desktop'"
        >
          Desktop
        </UButton>
        <UButton
          :variant="viewMode === 'mobile' ? 'solid' : 'ghost'"
          icon="i-lucide-smartphone"
          size="sm"
          @click="viewMode = 'mobile'"
        >
          Mobile
        </UButton>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-950">
      <div
        :class="[
          'mx-auto bg-white dark:bg-gray-900 shadow-lg transition-all duration-300',
          viewMode === 'mobile' ? 'max-w-sm' : 'max-w-full',
        ]"
      >
        <iframe
          ref="previewFrame"
          :srcdoc="previewHtml"
          class="w-full h-full min-h-screen border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import { buildPreviewHtml } from '~/utils/buildPreviewHtml'

export default defineComponent({
  name: 'PreviewPanel',
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const viewMode = ref<'desktop' | 'mobile'>('desktop')
    const previewFrame = ref<HTMLIFrameElement | null>(null)
    const previewHtml = computed(() => buildPreviewHtml(props.data))

    watch(
      () => props.data,
      () => {
        if (previewFrame.value?.contentWindow) {
          previewFrame.value.contentWindow.location.reload()
        }
      },
      { deep: true },
    )

    return {
      viewMode,
      previewFrame,
      previewHtml,
    }
  },
})
</script>
