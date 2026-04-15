<template>
  <UPage>
    <UPageHeader
      :title="$t('nav.sites')"
      :description="$t('dashboard.sitesSubtitle')"
      :ui="{
        root: 'border-none py-4',
        container: 'max-w-(--ui-container) px-4 sm:px-6 lg:px-8 ',
        description: 'mt-0',
      }"
    />
    <UPageBody>
      <UPageSection>
        <div v-if="pending" class="flex justify-center">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-muted" />
        </div>

        <div
          v-else-if="sites && sites.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <SiteCard v-for="site in sites" :key="site.id" :site="site" @refresh="refresh" />
        </div>

        <div v-else class="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <UIcon name="i-lucide-globe" class="size-12 text-muted" />
          <h2 class="text-lg font-semibold">
            {{ $t('dashboard.noSites') }}
          </h2>
          <p class="text-muted text-sm max-w-sm">
            {{ $t('dashboard.noSitesDescription') }}
          </p>
          <UButton
            v-if="canCreateSites"
            icon="i-lucide-plus"
            :label="$t('actions.createSite')"
            to="/dashboard/sites/new"
          />
        </div>
      </UPageSection>
    </UPageBody>
  </UPage>
</template>
<!-- <template>
  <UDashboardPanel>
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">
            {{ $t('nav.sites') }}
          </h1>
          <p class="text-muted text-sm mt-1">
            {{ $t('dashboard.sitesSubtitle') }}
          </p>
        </div>
        <UButton
          v-if="canCreateSites"
          icon="i-lucide-plus"
          :label="$t('actions.createSite')"
          to="/dashboard/sites/new"
        />
      </div>

      <div v-if="pending" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-muted" />
      </div>

      <div
        v-else-if="sites && sites.length > 0"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <SiteCard v-for="site in sites" :key="site.id" :site="site" @refresh="refresh" />
      </div>

      <div v-else class="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <UIcon name="i-lucide-globe" class="size-12 text-muted" />
        <h2 class="text-lg font-semibold">
          {{ $t('dashboard.noSites') }}
        </h2>
        <p class="text-muted text-sm max-w-sm">
          {{ $t('dashboard.noSitesDescription') }}
        </p>
        <UButton
          v-if="canCreateSites"
          icon="i-lucide-plus"
          :label="$t('actions.createSite')"
          to="/dashboard/sites/new"
        />
      </div>
    </div>
  </UDashboardPanel>
</template> -->

<script setup lang="ts">
definePageMeta({ layout: 'default', title: 'Dashboard' })

const { canManageSites, canCreateSites } = useRole()

const { data: sites, refresh, pending } = await useFetch('/api/sites')
</script>
