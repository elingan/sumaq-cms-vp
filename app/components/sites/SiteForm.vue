<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Site } from '~/shared/types/site'

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
  githubRepoUrl: z.string().url(t('validation.url')).optional().or(z.literal('')),
  githubBranch: z.string().default('main'),
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

async function onSubmit(payload: FormSubmitEvent<Schema>) {
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

        <UFormField :label="t('sites.githubRepoUrl')" name="githubRepoUrl">
          <UInput
            v-model="state.githubRepoUrl"
            placeholder="https://github.com/..."
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('sites.domain')" name="domain">
          <UInput v-model="state.domain" placeholder="example.com" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="ghost" @click="emit('update:open', false)">
            {{ t('actions.cancel') }}
          </UButton>
          <UButton type="submit" :loading="loading">
            {{ isEdit ? t('actions.save') : t('actions.create') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
