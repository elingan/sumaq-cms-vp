<template>
  <UDashboardPanel v-if="site">
    <template #header>
      <UDashboardNavbar :title="site.name">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/dashboard" />
        </template>

        <template #right>
          <UButton
            v-if="canManageSites"
            icon="i-lucide-settings"
            color="neutral"
            variant="ghost"
            :to="`/site/${id}/settings`"
            :title="t('nav.settings')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="p-6 space-y-6">
      <!-- Site info -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">
              {{ t('sites.information') }}
            </h2>
            <UBadge :color="site.status === 'active' ? 'success' : 'neutral'" variant="subtle">
              {{ t(`status.${site.status}`) }}
            </UBadge>
          </div>
        </template>

        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-muted">
              {{ t('sites.slug') }}
            </dt>
            <dd class="font-medium">
              {{ site.slug }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ t('sites.template') }}
            </dt>
            <dd class="font-medium">
              {{ site.template }}
            </dd>
          </div>
          <div v-if="site.githubRepoUrl">
            <dt class="text-muted">
              {{ t('sites.githubRepoUrl') }}
            </dt>
            <dd>
              <ULink :to="site.githubRepoUrl" target="_blank" class="text-primary">
                {{ site.githubRepoUrl }}
              </ULink>
            </dd>
          </div>
          <div v-if="site.siteUrl">
            <dt class="text-muted">
              {{ t('sites.siteUrl') }}
            </dt>
            <dd>
              <ULink :to="site.siteUrl" target="_blank" class="text-primary">
                {{ site.siteUrl }}
              </ULink>
            </dd>
          </div>
        </dl>
      </UCard>

      <!-- Pages list -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">
              {{ t('nav.pages') }}
            </h2>
            <UButton
              icon="i-lucide-plus"
              size="sm"
              :label="t('actions.create')"
              :to="`/site/${id}/pages/new`"
            />
          </div>
        </template>

        <div v-if="pages && pages.length > 0">
          <div
            v-for="page in pages"
            :key="page.id"
            class="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div>
              <p class="font-medium">
                {{ page.title || page.name }}
              </p>
              <p class="text-xs text-muted">{{ page.type }} · {{ page.name }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge
                :color="page.status === 'published' ? 'success' : 'neutral'"
                variant="subtle"
                size="sm"
              >
                {{ t(`status.${page.status}`) }}
              </UBadge>
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="ghost"
                :to="`/site/${id}/pages/${page.id}/edit`"
              />
            </div>
          </div>
        </div>

        <p v-else class="text-muted text-sm py-4 text-center">
          {{ t('sites.noPages') }}
        </p>
      </UCard>
    </div>

    <SiteForm v-model:open="showEditModal" :site="site" @saved="refresh" />
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string
const { canManageSites } = useRole()

const { data: site, refresh } = await useFetch(`/api/sites/${id}`)
const { data: pages } = await useFetch(`/api/pages/${id}`)

const showEditModal = ref(false)

async function archiveSite() {
  await $fetch(`/api/sites/${id}`, { method: 'DELETE' })
  await navigateTo('/dashboard')
}

useHead(() => ({
  title: site.value?.name ?? t('nav.sites'),
}))
</script>
