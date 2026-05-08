<template>
  <div>
    <UPageHero
      :title="$t('landing.heroTitle')"
      :description="$t('landing.heroDescription')"
      :links="[
        {
          label: $t('landing.getStarted'),
          to: isSignedIn ? '/dashboard' : '/auth/login',
          trailingIcon: 'i-lucide-arrow-right',
          size: 'xl',
        },
      ]"
    />

    <UPageSection
      id="features"
      :title="$t('landing.featuresTitle')"
      :description="$t('landing.featuresDescription')"
      :features="[
        {
          icon: 'i-lucide-pencil',
          title: $t('landing.feature1Title'),
          description: $t('landing.feature1Desc'),
        },
        {
          icon: 'i-lucide-git-branch',
          title: $t('landing.feature2Title'),
          description: $t('landing.feature2Desc'),
        },
        {
          icon: 'i-lucide-globe',
          title: $t('landing.feature3Title'),
          description: $t('landing.feature3Desc'),
        },
        {
          icon: 'i-lucide-users',
          title: $t('landing.feature4Title'),
          description: $t('landing.feature4Desc'),
        },
        {
          icon: 'i-lucide-zap',
          title: $t('landing.feature5Title'),
          description: $t('landing.feature5Desc'),
        },
        {
          icon: 'i-lucide-shield-check',
          title: $t('landing.feature6Title'),
          description: $t('landing.feature6Desc'),
        },
      ]"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
const { isSignedIn } = useAuth()
</script>
