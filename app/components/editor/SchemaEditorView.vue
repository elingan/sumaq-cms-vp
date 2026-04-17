<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="schemaTitle">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UBadge v-if="siteCms?.draft.hasDraftChanges" color="warning" variant="subtle">
              {{ siteCms.draft.changesCount }} cambios pendientes
            </UBadge>

            <UButton
              icon="i-lucide-save"
              color="primary"
              :loading="isSaving"
              :disabled="!isDirty || isSaving || isLoading"
              @click="saveSchema"
            >
              Guardar esquema
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 lg:p-6">
        <UAlert
          v-if="siteCms?.usingExampleCms"
          icon="i-lucide-info"
          color="warning"
          variant="subtle"
          title="Workspace local de esquemas"
          description="GitHub todavia no tiene la carpeta /cms. Estas editando la copia draft almacenada en Blob para este sitio."
        />

        <UAlert
          v-if="loadError"
          icon="i-lucide-triangle-alert"
          color="error"
          variant="subtle"
          title="No se pudo cargar el esquema"
          :description="loadError"
        />

        <UCard
          :ui="{
            body: 'p-0',
            header:
              'flex flex-col gap-3 border-b border-default px-4 py-4 lg:flex-row lg:items-center lg:justify-between',
          }"
        >
          <template #header>
            <div>
              <p class="text-sm font-medium text-highlighted">
                {{ schemaFileName }}
              </p>
              <p class="text-sm text-muted">
                {{ schemaDescription }}
              </p>
            </div>

            <div class="flex items-center gap-2 text-sm text-muted">
              <UIcon :name="schemaIcon" class="size-4" />
              <span>{{ isDirty ? 'Cambios sin guardar' : 'Sin cambios locales' }}</span>
            </div>
          </template>

          <div v-if="isLoading" class="space-y-3 p-4">
            <USkeleton class="h-6 w-48" />
            <USkeleton class="h-[62vh] w-full rounded-2xl" />
          </div>

          <ClientOnly v-else>
            <SchemaMonacoEditor v-model="draftContent" :disabled="isSaving" />
          </ClientOnly>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { SiteCmsNavigation } from '#shared/types/cms'
import SchemaMonacoEditor from './SchemaMonacoEditor.vue'

interface Props {
  schemaType: 'page' | 'collection'
}

const props = defineProps<Props>()

const route = useRoute()
const toast = useToast()

const slug = computed(() => route.params.slug as string)
const schemaName = computed(() => route.params.name as string)
const schemaFileName = computed(() => `${props.schemaType}.${schemaName.value}.yaml`)
const schemaTitle = computed(() => `${schemaName.value} schema`)
const schemaDescription = computed(() =>
  props.schemaType === 'page'
    ? 'Este archivo define los campos disponibles para la pagina seleccionada.'
    : 'Este archivo define la estructura de la coleccion seleccionada.',
)
const schemaIcon = computed(() =>
  props.schemaType === 'page' ? 'i-lucide-file-text' : 'i-lucide-database',
)

const {
  data: siteCms,
  pending: siteCmsPending,
  error: siteCmsError,
  refresh: refreshSiteCms,
} = await useFetch<SiteCmsNavigation>(() => `/api/sites/slug/${slug.value}/cms`, {
  watch: [slug],
  key: `site-cms-${slug.value}`,
})

const draftContent = ref('')
const originalContent = ref('')
const isLoading = ref(true)
const isSaving = ref(false)
const loadError = ref<string | null>(null)

const siteId = computed(() => siteCms.value?.site.id ?? null)
const isDirty = computed(() => draftContent.value !== originalContent.value)

async function loadSchema() {
  if (!siteId.value) {
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    const content = await $fetch<string>(
      `/api/sites/${siteId.value}/cms/schema/${props.schemaType}/${schemaName.value}`,
      {
        responseType: 'text',
      },
    )

    draftContent.value = content
    originalContent.value = content
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'No se pudo cargar el esquema.'
  } finally {
    isLoading.value = false
  }
}

async function saveSchema() {
  if (!siteId.value || !isDirty.value) {
    return
  }

  isSaving.value = true

  try {
    await $fetch(`/api/sites/${siteId.value}/cms/schema/${props.schemaType}/${schemaName.value}`, {
      method: 'PUT',
      body: {
        content: draftContent.value,
      },
    })

    originalContent.value = draftContent.value
    await refreshSiteCms()
    await refreshNuxtData(`site-cms-${slug.value}`)

    toast.add({
      title: 'Esquema guardado',
      description: 'El borrador se guardo en Blob y esta listo para publicar.',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    toast.add({
      title: 'No se pudo guardar',
      description: error instanceof Error ? error.message : 'Error inesperado al guardar.',
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
  } finally {
    isSaving.value = false
  }
}

watch(
  [siteId, schemaName],
  () => {
    if (siteId.value) {
      loadSchema()
    }
  },
  { immediate: true },
)

watch(siteCmsError, (error) => {
  if (error) {
    loadError.value = error.message
  }
})

onBeforeRouteLeave(() => {
  if (isDirty.value && process.client) {
    return window.confirm('Tienes cambios sin guardar. Deseas salir de todas formas?')
  }
})

useHead(() => ({
  title: `${schemaName.value} — Schema Editor`,
}))

if (import.meta.client) {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!isDirty.value) {
      return
    }

    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
}
</script>
