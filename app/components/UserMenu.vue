<template>
  <UDropdownMenu
    :items="items"
    :content="{
      align: 'end',
      side: 'bottom',
      sideOffset: 8,
    }"
  >
    <UButton :avatar="avatar" :label="displayName" color="neutral" variant="ghost" />
    <template #content-top>
      <UUser
        :name="displayName"
        :description="description"
        :avatar="avatar"
        size="xl"
        class="pointer-events-none p-4 border-b border-muted"
      />
    </template>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useClerk } from '#imports'

defineProps<{
  collapsed?: boolean
}>()

const { user } = useUser()
const clerk = useClerk()

const displayName = computed(() => {
  const firstName = user.value?.firstName
  const lastName = user.value?.lastName
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return fullName || user.value?.emailAddresses[0]?.emailAddress || 'User'
})

const description = computed(() => {
  const role = user.value?.publicMetadata?.role as string | undefined

  if (role === 'admin') return 'Administrator'
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

  const role = user.value?.publicMetadata?.role as string | undefined

  if (role === 'admin') {
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
      async onSelect() {
        await clerk.value?.signOut()
        // await navigateTo('/login')
      },
    },
  ])

  return menuItems
})
</script>
