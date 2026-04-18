<script setup lang="ts">
import { parse } from 'yaml'
import type { SiteCmsNavigation } from '#shared/types/cms'
import type { SchemaField, SchemaSection } from '#shared/types/schema'

definePageMeta({ layout: 'site' })

const route = useRoute()
const toast = useToast()

const slug = computed(() => route.params.slug as string)
const schemaName = computed(() => route.params.name as string)

const { data: siteCms, error: siteCmsError } = await useFetch<SiteCmsNavigation>(
  () => `/api/sites/slug/${slug.value}/cms`,
  {
    watch: [slug],
    key: `site-cms-page-${slug.value}`,
  },
)

const siteId = computed(() => siteCms.value?.site.id ?? null)
const sections = ref<SchemaSection[]>([])
const formState = ref<Record<string, unknown>>({})
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const hasLoadedInitialState = ref(false)

function parseSections(raw: Record<string, unknown>): SchemaSection[] {
  return Object.entries(raw).map(([sectionKey, value]) => {
    const section = value as Record<string, unknown>
    const sectionId = (section.id as string) ?? sectionKey

    const toField = (input: Record<string, unknown>): SchemaField => {
      const fieldId = (input.id as string) ?? (input.key as string)
      return {
        id: fieldId,
        key: fieldId,
        label: (input.label as string) ?? fieldId,
        type: input.type as SchemaField['type'],
        required: input.required as boolean | undefined,
        description: input.description as string | undefined,
        placeholder: input.placeholder as string | undefined,
        options: input.options as SchemaField['options'],
        fields: Array.isArray(input.fields)
          ? (input.fields as Record<string, unknown>[]).map((nested) => toField(nested))
          : undefined,
      }
    }

    return {
      id: sectionId,
      key: sectionId,
      label: (section.label as string) ?? sectionId,
      description: section.description as string | undefined,
      icon: section.icon as string | undefined,
      fields: ((section.fields as Record<string, unknown>[]) ?? []).map((field) => toField(field)),
    }
  })
}

async function loadEditorState() {
  if (!siteId.value) {
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    const [schemaText, contentResponse] = await Promise.all([
      $fetch<string>(`/api/sites/${siteId.value}/cms/schema/page/${schemaName.value}`, {
        responseType: 'text',
      }),
      $fetch<{ data: { content: Record<string, unknown> } }>(
        `/api/sites/${siteId.value}/data/page/${schemaName.value}`,
      ),
    ])

    sections.value = parseSections(parse(schemaText) as Record<string, unknown>)
    formState.value = contentResponse.data.content ?? {}
    hasLoadedInitialState.value = true
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'No se pudo cargar el editor.'
  } finally {
    isLoading.value = false
  }
}

async function savePage(content: Record<string, unknown>, notify = true) {
  if (!siteId.value) {
    return
  }

  isSaving.value = true

  try {
    const endpoint: string = ['/api/sites', siteId.value, 'data', 'page', schemaName.value].join(
      '/',
    )

    await $fetch(endpoint, {
      method: 'PUT',
      body: { content },
    })

    if (notify) {
      toast.add({
        title: 'Contenido guardado',
        description: 'El borrador de la pagina se guardo en /data.',
        color: 'success',
        icon: 'i-lucide-check',
      })
    }
  } catch (error) {
    if (notify) {
      toast.add({
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Error inesperado al guardar.',
        color: 'error',
        icon: 'i-lucide-triangle-alert',
      })
    }
  } finally {
    isSaving.value = false
  }
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null

watch(
  [siteId, schemaName],
  () => {
    hasLoadedInitialState.value = false
    formState.value = {}
    sections.value = []
    loadEditorState()
  },
  { immediate: true },
)

watch(
  formState,
  (state) => {
    if (!hasLoadedInitialState.value || !siteId.value || isLoading.value || isSaving.value) {
      return
    }

    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
    }

    autosaveTimer = setTimeout(() => {
      savePage(state, false)
    }, 1200)
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
  }
})

useHead(() => ({
  title: `${schemaName.value} — Page Editor`,
}))
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="schemaName">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <UAlert
          v-if="siteCmsError"
          icon="i-lucide-triangle-alert"
          color="error"
          variant="subtle"
          title="No se pudo cargar el sitio"
          :description="siteCmsError.message"
          class="mb-4"
        />

        <UAlert
          v-if="loadError"
          icon="i-lucide-triangle-alert"
          color="error"
          variant="subtle"
          title="No se pudo cargar el editor"
          :description="loadError"
          class="mb-4"
        />

        <template v-if="isLoading">
          <div class="space-y-4">
            <USkeleton class="h-10 w-60" />
            <USkeleton class="h-52 w-full" />
            <USkeleton class="h-52 w-full" />
          </div>
        </template>

        <EditorDynamicForm
          v-else
          v-model="formState"
          :sections="sections"
          :is-saving="isSaving"
          @submit="savePage($event, true)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
