<script setup lang="ts">
import type { Site } from '#shared/types/site'

definePageMeta({ layout: 'site' })

const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string
const { canManageSites } = useRole()

const { data: site, refresh } = await useFetch<Site>(`/api/sites/${id}`)

const showEditModal = ref(false)

useHead(() => ({ title: `${site.value?.name ?? ''} — ${t('nav.settings')}` }))
</script>

<template>
  <UDashboardPanel v-if="site">
    <template #header>
      <UDashboardNavbar :title="t('nav.settings')">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" :to="`/site/${id}`" />
        </template>

        <template #right>
          <UButton
            v-if="canManageSites"
            icon="i-lucide-pencil"
            :label="t('actions.edit')"
            @click="showEditModal = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="p-6">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            {{ site.name }}
          </h2>
        </template>

        <dl class="space-y-3 text-sm">
          <div v-if="site.description">
            <dt class="text-muted">
              {{ t('sites.description') }}
            </dt>
            <dd>{{ site.description }}</dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ t('sites.slug') }}
            </dt>
            <dd class="font-mono">
              {{ site.slug }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ t('sites.language') }}
            </dt>
            <dd>{{ site.language }}</dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ t('sites.githubBranch') }}
            </dt>
            <dd class="font-mono">
              {{ site.githubBranch }}
            </dd>
          </div>
          <div v-if="site.vercelProjectId">
            <dt class="text-muted">Vercel Project ID</dt>
            <dd class="font-mono">
              {{ site.vercelProjectId }}
            </dd>
          </div>
        </dl>
      </UCard>
    </div>

    <SiteForm v-model:open="showEditModal" :site="site" @saved="refresh" />
  </UDashboardPanel>
</template>
