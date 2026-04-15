<script setup lang="ts">
import { en, es, de } from '@nuxt/ui/locale'

const { locale, setLocale } = useI18n()

const handleLocaleChange = (value: string) => {
  setLocale(value as 'en' | 'es' | 'de')
}
</script>

<template>
  <ULocaleSelect
    :model-value="locale"
    :locales="[en, es, de]"
    @update:model-value="handleLocaleChange"
  />
</template>
