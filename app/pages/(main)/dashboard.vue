<template>
  <UPage>
    <!-- <UPageHeader
      :title="$t('nav.sites')"
      :description="$t('dashboard.sitesSubtitle')"
      :ui="{
        root: 'border-none py-4',
        container: 'max-w-(--ui-container) px-4 sm:px-6 lg:px-8 ',
        description: 'mt-0',
      }"
    /> -->
    <div class="space-y-8 mb-16">
      <UPageHeader :title="$t('nav.sites')" :description="$t('dashboard.sitesSubtitle')">
        <template #links>
          <UButton
            v-if="canCreateSites"
            icon="i-lucide-plus"
            :label="$t('actions.createSite')"
            @click="showCreateModal = true"
          />
        </template>
      </UPageHeader>

      <UPageGrid>
        <SitesSiteCard
          v-for="site in sites"
          :key="site.id"
          :site="site"
          :orientation="orientation"
          @refresh="refresh"
        />
      </UPageGrid>

      <UPageCTA
        v-if="!sites?.length"
        title="Trusted and supported by our amazing community"
        description="We've built a strong, lasting partnership. Their trust is our driving force, propelling us towards shared success."
        :links="siteLinks"
      />
      <div v-if="pending" class="flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-muted" />
      </div>
    </div>
    <!-- </UPageBody> -->
    <div class="space-y-8 mb-16">
      <UPageHeader :title="$t('nav.calendar')" :description="$t('dashboard.calendarSubtitle')">
        <template #links>
          <UButton
            v-if="canCreateSites"
            icon="i-lucide-plus"
            :label="$t('actions.createCalendar')"
            @click="showCreateModal = true"
          />
        </template>
      </UPageHeader>
      <UPageCTA
        title="Trusted and supported by our amazing community"
        description="We've built a strong, lasting partnership. Their trust is our driving force, propelling us towards shared success."
        :links="siteLinks"
      />
    </div>

    <SitesSiteForm v-model:open="showCreateModal" @saved="handleSiteSaved" />
  </UPage>
</template>

<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

definePageMeta({ layout: 'default', title: 'Dashboard' })

const { canCreateSites } = useRole()
const showCreateModal = ref(false)

const { data: sites, refresh, pending } = await useFetch('/api/sites')

const orientation = computed(() =>
  sites.value && sites.value.length > 1 ? 'vertical' : 'horizontal',
)

const siteLinks = ref<ButtonProps[]>([
  {
    label: 'Get started',
    color: 'primary',
    variant: 'solid',
    trailingIcon: 'i-lucide-plus',
  },
  {
    label: 'Learn more',
    color: 'neutral',
    variant: 'subtle',
    trailingIcon: 'i-lucide-arrow-right',
  },
])

function handleSiteSaved() {
  refresh()
}
</script>
