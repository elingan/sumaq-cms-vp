<script setup lang="ts">
interface GitHubStatus {
  connected: boolean
  installationId: number | null
  accountLogin: string | null
  accountType: string | null
}

definePageMeta({ layout: 'default', title: 'Admin' })

const { t } = useI18n()
const loading = ref(false)
const actionError = ref<string | null>(null)

const {
  data: githubStatus,
  pending: statusPending,
  error: statusError,
  refresh,
} = await useFetch<GitHubStatus>('/api/github/status')

async function connectGitHubApp() {
  await navigateTo('/api/github/connect', { external: true })
}

async function disconnectGitHubApp() {
  loading.value = true
  actionError.value = null

  try {
    await $fetch('/api/github/disconnect', { method: 'POST' })
    await refresh()
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    actionError.value = e?.data?.message ?? t('admin.githubDisconnectError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UPage>
    <UPageHeader
      :title="$t('admin.title')"
      :description="$t('admin.description')"
      :ui="{
        root: 'border-none py-4',
        container: 'max-w-(--ui-container) px-4 sm:px-6 lg:px-8 ',
        description: 'mt-0',
      }"
    />

    <UPageBody>
      <UPageSection>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold">
                  {{ t('admin.githubIntegrationTitle') }}
                </h2>
                <p class="text-sm text-muted mt-1">
                  {{ t('admin.githubIntegrationDescription') }}
                </p>
              </div>

              <UBadge
                :color="githubStatus?.connected ? 'success' : 'warning'"
                variant="subtle"
                :label="
                  githubStatus?.connected
                    ? t('admin.githubConnected')
                    : t('admin.githubDisconnected')
                "
              />
            </div>
          </template>

          <div v-if="statusPending" class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
            {{ t('admin.githubLoadingStatus') }}
          </div>

          <UAlert
            v-else-if="statusError"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            :title="t('admin.githubStatusLoadError')"
          />

          <div v-else class="space-y-3">
            <p
              v-if="githubStatus?.connected && githubStatus.accountLogin"
              class="text-sm text-muted"
            >
              {{ t('admin.githubConnectedAs', { account: githubStatus.accountLogin }) }}
            </p>

            <p v-else class="text-sm text-muted">
              {{ t('admin.githubDisconnectedHelp') }}
            </p>

            <UAlert
              v-if="actionError"
              color="error"
              variant="soft"
              icon="i-lucide-alert-triangle"
              :title="actionError"
            />
          </div>

          <template #footer>
            <div class="flex flex-wrap gap-2 justify-end">
              <UButton
                v-if="githubStatus?.connected"
                color="error"
                variant="soft"
                icon="i-lucide-unplug"
                :label="t('admin.disconnectGitHubApp')"
                :loading="loading"
                @click="disconnectGitHubApp"
              />

              <UButton
                color="primary"
                icon="i-lucide-plug"
                :label="
                  githubStatus?.connected
                    ? t('admin.reconnectGitHubApp')
                    : t('admin.connectGitHubApp')
                "
                @click="connectGitHubApp"
              />
            </div>
          </template>
        </UCard>
      </UPageSection>
    </UPageBody>
  </UPage>
</template>
