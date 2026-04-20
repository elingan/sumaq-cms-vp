<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Site } from '#shared/types/site'

interface GitHubStatus {
  connected: boolean
  installationId: number | null
  accountLogin: string | null
  accountType: string | null
}

interface GitHubRepository {
  name: string
  fullName: string
  url: string
  defaultBranch: string
}

interface Props {
  site?: Partial<Site>
  open: boolean
}

const props = withDefaults(defineProps<Props>(), {
  site: () => ({}),
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved', site: Site): void
}>()

const { t } = useI18n()
const { isAdmin } = useRole()
const isEdit = computed(() => !!props.site?.id)

const schema = z.object({
  name: z.string().min(1, t('validation.required')),
  slug: z
    .string()
    .min(1, t('validation.required'))
    .regex(/^[a-z0-9-]+$/, t('validation.slugFormat')),
  description: z.string().optional(),
  language: z.string().default('en'),
  template: z.string().default('blank'),
  githubRepoUrl: z.string().url(t('validation.url')),
  githubBranch: z.string().min(1, t('validation.required')),
  domain: z.string().optional(),
  siteUrl: z.string().url(t('validation.url')).optional().or(z.literal('')),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: props.site.name ?? '',
  slug: props.site.slug ?? '',
  description: props.site.description ?? '',
  language: props.site.language ?? 'en',
  template: props.site.template ?? 'blank',
  githubRepoUrl: props.site.githubRepoUrl ?? '',
  githubBranch: props.site.githubBranch ?? 'main',
  domain: props.site.domain ?? '',
  siteUrl: props.site.siteUrl ?? '',
})

const loading = ref(false)
const error = ref<string | null>(null)
const githubError = ref<string | null>(null)
const statusLoading = ref(false)
const repositoriesLoading = ref(false)
const branchesLoading = ref(false)
const githubStatus = ref<GitHubStatus>({
  connected: false,
  installationId: null,
  accountLogin: null,
  accountType: null,
})
const repositories = ref<GitHubRepository[]>([])
const branches = ref<string[]>([])

const hasRepositories = computed(() => repositories.value.length > 0)
const canSubmit = computed(() => githubStatus.value.connected && hasRepositories.value)

function getFullNameFromUrl(repoUrl: string): string | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\s*$|\/)/)
  if (!match) return null
  return `${match[1]}/${match[2]}`
}

function resetStateFromProps(site: Partial<Site> = {}) {
  state.name = site.name ?? ''
  state.slug = site.slug ?? ''
  state.description = site.description ?? ''
  state.language = site.language ?? 'en'
  state.template = site.template ?? 'blank'
  state.githubRepoUrl = site.githubRepoUrl ?? ''
  state.githubBranch = site.githubBranch ?? 'main'
  state.domain = site.domain ?? ''
  state.siteUrl = site.siteUrl ?? ''
  error.value = null
}

function ensureCurrentRepositoryOption() {
  if (!state.githubRepoUrl) return
  if (repositories.value.some((repo) => repo.url === state.githubRepoUrl)) return

  const fullName = getFullNameFromUrl(state.githubRepoUrl)
  repositories.value = [
    ...repositories.value,
    {
      name: fullName?.split('/')[1] ?? state.githubRepoUrl,
      fullName: fullName ?? state.githubRepoUrl,
      url: state.githubRepoUrl,
      defaultBranch: state.githubBranch || 'main',
    },
  ]
}

async function loadBranches(repoUrl: string, fallbackBranch?: string) {
  const fullName =
    repositories.value.find((repo) => repo.url === repoUrl)?.fullName ?? getFullNameFromUrl(repoUrl)
  if (!fullName) {
    branches.value = fallbackBranch ? [fallbackBranch] : []
    return
  }

  branchesLoading.value = true
  githubError.value = null

  try {
    branches.value = await $fetch<string[]>('/api/github/branches', {
      query: { fullName },
    })

    if (fallbackBranch && !branches.value.includes(fallbackBranch)) {
      branches.value = [fallbackBranch, ...branches.value]
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    githubError.value = e?.data?.message ?? t('sites.githubBranchesLoadFailed')
    branches.value = fallbackBranch ? [fallbackBranch] : []
  } finally {
    branchesLoading.value = false
  }
}

async function loadGitHubData() {
  statusLoading.value = true
  repositoriesLoading.value = true
  githubError.value = null

  try {
    githubStatus.value = await $fetch<GitHubStatus>('/api/github/status')

    if (!githubStatus.value.connected) {
      repositories.value = []
      branches.value = []
      return
    }

    repositories.value = await $fetch<GitHubRepository[]>('/api/github/repos', {
      query: { prefix: 'www-' },
    })

    ensureCurrentRepositoryOption()

    if (state.githubRepoUrl) {
      await loadBranches(state.githubRepoUrl, state.githubBranch)
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    githubError.value = e?.data?.message ?? t('sites.githubReposLoadFailed')
  } finally {
    statusLoading.value = false
    repositoriesLoading.value = false
  }
}

async function connectGitHub() {
  await navigateTo('/api/github/connect', { external: true })
}

watch(
  () => props.site,
  (site) => {
    resetStateFromProps(site ?? {})
  },
  { immediate: true },
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetStateFromProps(props.site ?? {})
    githubError.value = null
    loadGitHubData()
  },
)

watch(
  () => state.githubRepoUrl,
  async (repoUrl, previousRepoUrl) => {
    if (!repoUrl || repoUrl === previousRepoUrl) return

    const selected = repositories.value.find((repo) => repo.url === repoUrl)
    if (selected && (!state.githubBranch || repoUrl !== props.site.githubRepoUrl)) {
      state.githubBranch = selected.defaultBranch
    }

    await loadBranches(repoUrl, state.githubBranch)
  },
)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (!canSubmit.value) {
    error.value = t('sites.githubNotConnected')
    return
  }

  loading.value = true
  error.value = null

  try {
    const result = await $fetch<Site>(isEdit.value ? `/api/sites/${props.site.id}` : '/api/sites', {
      method: isEdit.value ? 'PATCH' : 'POST',
      body: payload.data,
    })
    emit('saved', result)
    emit('update:open', false)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message ?? t('errors.saveFailed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="isEdit ? t('sites.editSite') : t('sites.createSite')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error" class="mb-4" />
      <UAlert
        v-if="githubError"
        color="warning"
        icon="i-lucide-triangle-alert"
        :title="githubError"
        class="mb-4"
      />

      <UAlert
        v-if="!statusLoading && !githubStatus.connected"
        color="warning"
        icon="i-lucide-link"
        :title="t('sites.githubNotConnected')"
        :description="t('sites.githubNotConnectedDescription')"
        class="mb-4"
      >
        <template #actions>
          <UButton
            v-if="isAdmin"
            color="warning"
            variant="soft"
            icon="i-lucide-plug"
            :label="t('sites.connectGitHubApp')"
            @click="connectGitHub"
          />
        </template>
      </UAlert>

      <UAlert
        v-else-if="githubStatus.connected && githubStatus.accountLogin"
        color="success"
        icon="i-lucide-check-circle-2"
        :title="t('sites.githubConnectedAs', { account: githubStatus.accountLogin })"
        class="mb-4"
      />

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField :label="t('sites.name')" name="name" required>
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField :label="t('sites.slug')" name="slug" required>
          <UInput v-model="state.slug" placeholder="my-site" class="w-full" :disabled="isEdit" />
        </UFormField>

        <UFormField :label="t('sites.description')" name="description">
          <UTextarea v-model="state.description" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('sites.language')" name="language">
            <UInput v-model="state.language" class="w-full" />
          </UFormField>

          <UFormField :label="t('sites.template')" name="template">
            <UInput v-model="state.template" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="t('sites.githubRepository')" name="githubRepoUrl" required>
          <USelectMenu
            v-model="state.githubRepoUrl"
            :items="repositories"
            value-key="url"
            label-key="fullName"
            :placeholder="
              repositoriesLoading ? t('sites.loadingRepositories') : t('sites.selectRepository')
            "
            class="w-full"
            :loading="repositoriesLoading"
            :disabled="!githubStatus.connected || repositoriesLoading"
          />
        </UFormField>

        <UFormField :label="t('sites.githubBranch')" name="githubBranch" required>
          <USelect
            v-model="state.githubBranch"
            :items="branches"
            class="w-full"
            :loading="branchesLoading"
            :disabled="!state.githubRepoUrl || branchesLoading"
          />
        </UFormField>

        <UAlert
          v-if="githubStatus.connected && !repositoriesLoading && !hasRepositories"
          color="neutral"
          variant="soft"
          icon="i-lucide-folder-search"
          :title="t('sites.noGitHubRepositories')"
          :description="t('sites.noGitHubRepositoriesDescription')"
        />

        <UFormField :label="t('sites.domain')" name="domain">
          <UInput v-model="state.domain" placeholder="example.com" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="ghost" @click="emit('update:open', false)">
            {{ t('actions.cancel') }}
          </UButton>
          <UButton type="submit" :loading="loading" :disabled="!canSubmit">
            {{ isEdit ? t('actions.save') : t('actions.create') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
