<template>
  <UPage>
    <div class="space-y-8 mt-8 mb-16">
      <SiteDashboardSection
        :site-cards="siteCards"
        :can-create-sites="canCreateSites"
        :has-sites="Boolean(sites?.length)"
        @site-created="refreshSites"
      />
      <CalendarDashboardSection
        :locations="locations"
        :can-create-bookings="canCreateBookings"
        @create-booking="navigateToBookings"
        @view-location="navigateToLocation"
      />
      <div v-if="pendingSites" class="flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-muted" />
      </div>
    </div>
  </UPage>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', title: 'Dashboard' })

const router = useRouter()
const { canCreateSites, canCreateBookings } = useRole()

const { data: sites, refresh: refreshSites, pending: pendingSites } = await useFetch('/api/sites')
const { data: locations } = await useFetch('/api/bookings/locations')

const siteCards = computed(() => {
  const items = sites.value?.map((site) => {
    return {
      id: site.id,
      to: `/site/${site.slug}`,
      slug: site.slug,
      title: site.name,
      description: site.description,
      imageUrl: site.screenshotUrl ?? 'https://placeholder.co/300x200',
      status: site.status,
      updatedAt: site.updatedAt,
    }
  })

  return items
})

function navigateToBookings() {
  const firstLocationId = locations.value?.[0]?.id

  if (firstLocationId) {
    router.push(`/bookings/${firstLocationId}`)
  } else {
    router.push('/bookings')
  }
}

function navigateToLocation(locationId: string) {
  router.push(`/bookings/${locationId}`)
}
</script>
