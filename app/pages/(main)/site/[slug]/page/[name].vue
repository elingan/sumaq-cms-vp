<script setup lang="ts">
import { parse } from 'yaml'
import type { SiteCmsNavigation } from '#shared/types/cms'
import type { FormState, SchemaSection } from '#shared/types/schema'
import { parseSections } from '#shared/utils/schema'

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
const formState = ref<FormState>({})
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const hasLoadedInitialState = ref(false)
const contextualSurface = useContextualSurface({
  sections,
  formState,
  save: async (content) => {
    await savePage(content, true)
  },
})

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
      $fetch<{ data: { content: FormState } }>(
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

async function savePage(content: FormState, notify = true) {
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

        <template #right>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="contextualSurface.hasContextualTargets.value"
              color="primary"
              variant="subtle"
            >
              {{ contextualSurface.contextualEditor.targets.value.length }} bloques editables
            </UBadge>

            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-panel-bottom-open"
              :disabled="!contextualSurface.hasContextualTargets.value"
              @click="contextualSurface.contextualEditor.setContextualMode(true)"
            >
              Vista previa editable
            </UButton>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-table-properties"
              @click="contextualSurface.contextualEditor.setContextualMode(false)"
            >
              Formulario completo
            </UButton>
          </div>
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

        <UAlert
          v-else-if="
            contextualSurface.contextualEditor.isContextualMode.value &&
            !contextualSurface.hasContextualTargets.value
          "
          icon="i-lucide-info"
          color="info"
          variant="subtle"
          title="Sin bloques editables contextuales"
          description="Los campos anidados complejos siguen disponibles en el formulario completo."
        />

        <div
          v-else-if="contextualSurface.contextualEditor.isContextualMode.value"
          class="relative space-y-4 pb-40"
        >
          <UAlert
            icon="i-lucide-sparkles"
            color="primary"
            variant="subtle"
            title="Modo contextual activo"
            description="Pasa el cursor por un bloque editable y haz click para abrir el panel inferior."
          />

          <EditorContextualPreview
            ref="contextualSurface.previewRef"
            :sections="sections"
            :model-value="formState"
            :targets="contextualSurface.contextualEditor.targets.value"
            :hovered-target-id="contextualSurface.contextualEditor.hoveredTargetId.value"
            :selected-target-id="contextualSurface.contextualEditor.selectedTargetId.value"
            @hover-target="contextualSurface.handleHoverTarget"
            @leave-target="contextualSurface.handleLeaveTarget"
            @select-target="contextualSurface.handleSelectTarget"
          />

          <EditorContextualHighlightOverlay
            :rect="contextualSurface.contextualEditor.overlayRect.value"
            :target="
              contextualSurface.contextualEditor.selectedTarget.value ??
              contextualSurface.contextualEditor.hoveredTarget.value
            "
            :is-selected="!!contextualSurface.contextualEditor.selectedTargetId.value"
          />

          <EditorContextualDrawer
            :open="contextualSurface.contextualEditor.drawerOpen.value"
            :target="contextualSurface.contextualEditor.selectedTarget.value"
            :field="contextualSurface.contextualEditor.selectedField.value"
            :model-value="contextualSurface.contextualEditor.selectedValue.value"
            :is-saving="isSaving"
            :is-dirty="contextualSurface.contextualEditor.isDirty.value"
            @update:model-value="contextualSurface.contextualEditor.updateSelectedValue($event)"
            @save="contextualSurface.saveContextualField"
            @close="contextualSurface.closeContextualDrawer"
            @open-form="contextualSurface.openFullForm"
          />
        </div>

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
