<template>
  <UApp>
    <UDashboardGroup unit="rem">
      <UDashboardSidebar
        id="site"
        v-model:open="open"
        collapsible
        resizable
        class="bg-elevated/25"
        :ui="{ footer: 'lg:border-t lg:border-default' }"
      >
        <template #header="{ collapsed }">
          <div class="flex min-w-0 items-center gap-2">
            <UButton
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              square
              :to="dashboardPath"
              :aria-label="t('nav.dashboard')"
            />

            <div v-if="!collapsed" class="min-w-0">
              <p class="truncate font-semibold">
                {{ siteName }}
              </p>
            </div>
          </div>
        </template>

        <template #default="{ collapsed }">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="contentLinks"
            orientation="vertical"
            tooltip
            popover
          />

          <UNavigationMenu
            v-if="canEditSchemas"
            :collapsed="collapsed"
            :items="schemaLinks"
            orientation="vertical"
            tooltip
            popover
          />

          <div v-if="canEditSchemas && siteCms?.site.githubRepoUrl && !collapsed" class="px-3 pb-3">
            <UButton
              block
              icon="i-lucide-upload"
              color="primary"
              variant="soft"
              :loading="isPublishingSchemas"
              :disabled="!canPublishSchemas"
              @click="publishSchemas"
            >
              Publica esquema
            </UButton>

            <p class="mt-2 text-xs text-muted">
              {{ publishSummaryText }}
            </p>

            <UButton
              block
              icon="i-lucide-file-up"
              color="neutral"
              variant="soft"
              class="mt-3"
              :loading="isPublishingData"
              :disabled="!canPublishData"
              @click="publishData"
            >
              Publica data
            </UButton>

            <p class="mt-2 text-xs text-muted">
              {{ publishDataSummaryText }}
            </p>
          </div>

          <UNavigationMenu
            v-if="isAdmin"
            :collapsed="collapsed"
            :items="adminLinks"
            orientation="vertical"
            tooltip
            popover
          />

          <UNavigationMenu
            :collapsed="collapsed"
            :items="supportLinks"
            orientation="vertical"
            tooltip
            class="mt-auto"
          />
        </template>

        <template #footer="{ collapsed }">
          <UserMenu :collapsed="collapsed" />
        </template>
      </UDashboardSidebar>

      <div class="flex min-w-0 flex-1 flex-col">
        <div class="px-4 pt-4 lg:px-6">
          <UAlert
            v-if="siteCms?.usingExampleCms"
            icon="i-lucide-info"
            color="warning"
            variant="subtle"
            title="Using example CMS content"
            :description="`No se encontro la carpeta /cms en el repositorio. Se usara el workspace draft en Blob bajo /site/${slug}/cms.`"
          />

          <UAlert
            v-else-if="siteCmsError"
            icon="i-lucide-triangle-alert"
            color="error"
            variant="subtle"
            title="No se pudo cargar la estructura CMS"
            :description="siteCmsError.message"
          />
        </div>

        <slot />
      </div>
    </UDashboardGroup>
  </UApp>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'
import type {
  SiteCmsNavigation,
  SiteDataStatusResponse,
  SiteDataSyncResult,
} from '#shared/types/cms'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const toast = useToast()
const { isAdmin, isEditor, isOwner } = useRole()

const open = ref(false)
const isPublishingSchemas = ref(false)
const isPublishingData = ref(false)
const isSyncingData = ref(false)
const hasSyncedDataOnLoad = ref(false)

const slug = computed(() => route.params.slug as string)
const dashboardPath = computed(() => localePath('/dashboard'))
const canEditSchemas = computed(() => isAdmin.value || isOwner.value || isEditor.value)

const {
  data: siteCms,
  error: siteCmsError,
  refresh: refreshSiteCms,
} = await useFetch<SiteCmsNavigation>(() => `/api/sites/slug/${slug.value}/cms`, {
  watch: [slug],
  key: `site-cms-${slug.value}`,
})

const siteId = computed(() => siteCms.value?.site.id ?? null)

const dataStatus = ref<SiteDataStatusResponse | null>(null)

async function refreshDataStatus() {
  if (!siteId.value) {
    dataStatus.value = null
    return
  }

  try {
    const response = await $fetch<{ data: SiteDataStatusResponse }>(
      `/api/sites/${siteId.value}/data/status`,
    )
    dataStatus.value = response.data
  } catch {
    dataStatus.value = null
  }
}

const siteName = computed(() => siteCms.value?.site.name ?? slug.value)
const canPublishSchemas = computed(() => {
  return !!siteCms.value?.site.githubRepoUrl && !!siteCms.value?.draft.hasDraftChanges
})
const publishSummaryText = computed(() => {
  if (siteCms.value?.draft.hasDraftChanges) {
    return `${siteCms.value.draft.changesCount} cambio(s) listos para publicar en GitHub.`
  }

  return 'No hay cambios pendientes en los esquemas.'
})
const canPublishData = computed(() => {
  return !!siteCms.value?.site.githubRepoUrl && !!dataStatus.value?.draft.hasDraftChanges
})
const publishDataSummaryText = computed(() => {
  if (dataStatus.value?.draft.hasDraftChanges) {
    return `${dataStatus.value.draft.changesCount} cambio(s) de contenido listos para publicar en GitHub.`
  }

  return 'No hay cambios pendientes en /data.'
})

function closeSidebar() {
  open.value = false
}

async function syncDataWorkspace(force = false) {
  if (!siteCms.value?.site.id || isSyncingData.value) {
    return null
  }

  isSyncingData.value = true

  try {
    const result = await $fetch<{ data: SiteDataSyncResult }>(
      `/api/sites/${siteCms.value.site.id}/data/sync`,
      {
        method: 'POST',
        body: { force },
      },
    )

    await refreshDataStatus()
    return result
  } catch (error) {
    toast.add({
      title: 'No se pudo sincronizar data',
      description:
        error instanceof Error ? error.message : 'Error inesperado al sincronizar /data.',
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
    return null
  } finally {
    isSyncingData.value = false
  }
}

async function publishData() {
  if (!siteCms.value?.site.id || !canPublishData.value) {
    return
  }

  isPublishingData.value = true

  try {
    const response = await $fetch<{ data: { published: boolean } }>(
      `/api/sites/${siteCms.value.site.id}/data/publish`,
      {
        method: 'POST',
      },
    )

    await refreshDataStatus()

    toast.add({
      title: response.data.published ? 'Contenido publicado' : 'Sin cambios por publicar',
      description: response.data.published
        ? 'La carpeta /data fue sincronizada con GitHub.'
        : 'GitHub ya estaba sincronizado con el workspace draft de /data.',
      color: response.data.published ? 'success' : 'neutral',
      icon: response.data.published ? 'i-lucide-check' : 'i-lucide-info',
    })
  } catch (error) {
    toast.add({
      title: 'No se pudo publicar /data',
      description: error instanceof Error ? error.message : 'Error inesperado al publicar.',
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
  } finally {
    isPublishingData.value = false
  }
}

async function publishSchemas() {
  if (!siteCms.value?.site.id || !canPublishSchemas.value) {
    return
  }

  isPublishingSchemas.value = true

  try {
    const response = await $fetch<{ data: { published: boolean } }>(
      `/api/sites/${siteCms.value.site.id}/cms/publish`,
      {
        method: 'POST',
      },
    )

    await refreshSiteCms()
    await refreshNuxtData(`site-cms-${slug.value}`)

    toast.add({
      title: response.data.published ? 'Esquemas publicados' : 'Sin cambios por publicar',
      description: response.data.published
        ? 'La carpeta /cms fue sincronizada con GitHub.'
        : 'GitHub ya estaba sincronizado con el workspace draft.',
      color: response.data.published ? 'success' : 'neutral',
      icon: response.data.published ? 'i-lucide-check' : 'i-lucide-info',
    })
  } catch (error) {
    toast.add({
      title: 'No se pudo publicar',
      description: error instanceof Error ? error.message : 'Error inesperado al publicar.',
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
  } finally {
    isPublishingSchemas.value = false
  }
}

function sortCmsEntries<T extends { name: string }>(items: T[]): T[] {
  return items.sort((a, b) => {
    if (a.name === 'index') return -1
    if (b.name === 'index') return 1
    return a.name.localeCompare(b.name)
  })
}

function toChildItems(items: SiteCmsNavigation['pages']): NavigationMenuItem[] {
  return sortCmsEntries(items).map((item) => ({
    label: item.label,
    to: localePath(item.to),
    onSelect: closeSidebar,
  }))
}

function toSchemaItems(
  items: SiteCmsNavigation['pages'],
  type: 'page' | 'collection',
): NavigationMenuItem[] {
  return sortCmsEntries(items).map((item) => ({
    label: item.label,
    to: localePath(`/site/${slug.value}/schema/${type}/${item.name}`),
    onSelect: closeSidebar,
  }))
}

const contentLinks = computed<NavigationMenuItem[][]>(() => {
  const pages = toChildItems(siteCms.value?.pages ?? [])
  const collections = toChildItems(siteCms.value?.collections ?? [])

  return [
    [
      {
        label: 'Content',
        type: 'label',
      },
      {
        label: 'Pages',
        icon: 'i-lucide-file-text',
        badge: String(pages.length),
        defaultOpen: true,
        children: pages,
      },
      {
        label: 'Collections',
        icon: 'i-lucide-database',
        badge: String(collections.length),
        defaultOpen: true,
        children: collections,
      },
    ],
  ]
})

const schemaLinks = computed<NavigationMenuItem[][]>(() => {
  const pages = toSchemaItems(siteCms.value?.pages ?? [], 'page')
  const collections = toSchemaItems(siteCms.value?.collections ?? [], 'collection')
  return [
    [
      {
        label: 'Schemas',
        type: 'label',
      },
      {
        label: 'Pages',
        icon: 'i-lucide-file-text',
        badge: String(pages.length),
        defaultOpen: false,
        children: pages,
      },
      {
        label: 'Collections',
        icon: 'i-lucide-database',
        badge: String(collections.length),
        defaultOpen: false,
        children: collections,
      },
    ],
  ]
})

const adminLinks = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Admin',
    type: 'label',
  },
  {
    label: 'Configuration',
    icon: 'i-lucide-settings',
    to: localePath(`/site/${slug.value}/settings`),
    onSelect: closeSidebar,
  },
])

const supportLinks = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Blob Storage',
    icon: 'i-lucide-database-zap',
    to: 'https://hub.nuxt.com/docs/blob',
    target: '_blank',
  },
  ...(siteCms.value?.site.githubRepoUrl
    ? [
        {
          label: 'Repository',
          icon: 'i-simple-icons-github',
          to: siteCms.value.site.githubRepoUrl,
          target: '_blank',
        },
      ]
    : []),
])

onMounted(() => {
  watch(siteId, () => refreshDataStatus(), { immediate: true })

  watch(
    () => siteCms.value?.site.id,
    async (siteId) => {
      if (!siteId || hasSyncedDataOnLoad.value) {
        return
      }

      hasSyncedDataOnLoad.value = true
      const result = await syncDataWorkspace(false)

      if (!result?.data.requiresConfirmation || !import.meta.client) {
        return
      }

      const shouldForceSync = window.confirm(
        'Hay diferencias entre /data local y GitHub. Deseas sobrescribir el draft local con GitHub?',
      )

      if (!shouldForceSync) {
        return
      }

      await syncDataWorkspace(true)
      await refreshSiteCms()
      await refreshDataStatus()
      await refreshNuxtData(`site-cms-${slug.value}`)
    },
    { immediate: true },
  )
})
</script>
