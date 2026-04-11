<template>
  <div class="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-arrow-left" variant="ghost" :to="`/site/${siteId}`" />
        <div>
          <h1 class="text-xl font-semibold">
            {{ page?.title || page?.name || t('editor.untitled') }}
          </h1>
          <div class="flex items-center gap-2 mt-1">
            <UBadge
              :label="page?.status ?? 'draft'"
              :color="page?.status === 'published' ? 'success' : 'warning'"
              variant="subtle"
              size="xs"
            />
            <span v-if="lastSaved" class="text-xs text-muted">
              {{ t('editor.lastSaved', { time: lastSaved }) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          :label="t('editor.saveDraft')"
          color="neutral"
          variant="outline"
          :loading="isSaving"
          @click="saveContent('draft')"
        />
        <UButton
          :label="t('actions.publish')"
          :loading="isSaving"
          @click="saveContent('published')"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pageLoading || schemaLoading" class="flex flex-col gap-4">
      <USkeleton class="h-48 rounded-lg" />
      <USkeleton class="h-48 rounded-lg" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="pageError || schemaError"
      icon="i-lucide-alert-circle"
      color="error"
      variant="subtle"
      :description="pageError?.message ?? schemaError ?? t('errors.loadFailed')"
    />

    <!-- Form -->
    <DynamicForm
      v-else-if="sections.length"
      :sections="sections"
      :model-value="formState"
      :is-saving="isSaving"
      @update:model-value="handleFormUpdate"
      @submit="saveContent('draft')"
    />

    <UAlert
      v-else
      icon="i-lucide-file-question"
      color="info"
      variant="subtle"
      :description="t('editor.noSchema')"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const { t } = useI18n()
const route = useRoute()

const siteId = computed(() => route.params.id as string)
const pageId = computed(() => route.params.pageId as string)

// Load page content
const {
  data: page,
  pending: pageLoading,
  error: pageError,
  refresh: refreshPage,
} = await useFetch(() => `/api/pages/${siteId.value}/${pageId.value}`)

// Load schema
const {
  sections,
  loading: schemaLoading,
  error: schemaError,
} = await usePageSchema(siteId.value, page.value?.type ?? 'page')

// Form state initialized from content_json
const formState = ref<Record<string, unknown>>(
  (page.value?.contentJson as Record<string, unknown>) ?? {},
)

// Auto-save state
const isSaving = ref(false)
const lastSaved = ref<string | null>(null)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

function handleFormUpdate(value: Record<string, unknown>) {
  formState.value = value
  scheduleAutoSave()
}

function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    saveContent('draft')
  }, 3000)
}

async function saveContent(status: 'draft' | 'published') {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
  isSaving.value = true
  try {
    await $fetch(`/api/pages/${siteId.value}/${pageId.value}`, {
      method: 'PUT',
      body: {
        contentJson: formState.value,
        status,
      },
    })
    lastSaved.value = new Date().toLocaleTimeString()
    await refreshPage()
  } catch (err) {
    useToast().add({
      title: t('errors.saveFailed'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isSaving.value = false
  }
}

onUnmounted(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})
</script>
