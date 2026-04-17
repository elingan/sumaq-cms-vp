<template>
  <UDropdownMenu
    :items="items"
    :content="{
      align: 'end',
      side: 'bottom',
      sideOffset: 8,
    }"
  >
    <UButton :avatar="avatar" color="neutral" variant="ghost" />
    <template #content-top>
      <UUser
        :name="displayName"
        :description="description"
        :avatar="avatar"
        class="pointer-events-none px-2 pt-2"
      />
    </template>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { user } = useUserSession()

const displayName = computed(() => user.value?.name || user.value?.email || 'User')
const description = computed(() => {
  if (user.value?.role === 'admin') return 'Administrator'
  return 'User'
})

const avatar = computed(() => ({
  src: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.value)}`,
  alt: displayName.value,
}))

const items = computed<DropdownMenuItem[][]>(() => {
  const menuItems: DropdownMenuItem[][] = [
    [
      {
        label: 'Profile',
        icon: 'i-lucide-user',
        to: '/profile',
      },
      {
        label: 'Billing',
        icon: 'i-lucide-credit-card',
        to: '/billing',
      },
      {
        label: 'Settings',
        icon: 'i-lucide-settings',
        to: '/settings',
      },
    ],
  ]

  if (user.value?.role === 'admin') {
    menuItems.push([
      {
        label: 'Admin',
        icon: 'i-lucide-layout-template',
        to: '/admin',
      },
    ])
  }

  menuItems.push([
    {
      label: 'Log out',
      icon: 'i-lucide-log-out',
    },
  ])

  return menuItems
})
</script>
