import { deDE, enGB, esES } from '@clerk/localizations'
// import { updateClerkOptions } from '@clerk/nuxt'

const clerkLocalizations: Record<string, typeof enGB> = {
  en: enGB,
  es: esES,
  de: deDE,
}

export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n as ReturnType<typeof useI18n>
  const locale = i18n.locale

  watch(
    locale,
    (newLocale) => {
      const localization = clerkLocalizations[newLocale] ?? enGB
      console.log(`Updating Clerk localization to: ${newLocale}`, localization)
      // updateClerkOptions({ localization })
    },
    { immediate: true },
  )
})
