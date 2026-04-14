<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { UserRole } from '#shared/types/user'

interface UserFormUser {
  id: string
  email: string
  name: string | null
  role: UserRole
}

interface UserFormResult {
  user: UserFormUser
  passwordSetupLink?: string
  passwordSetupExpiresAt?: string
}

interface Props {
  open: boolean
  user?: UserFormUser | null
}

const props = withDefaults(defineProps<Props>(), {
  user: null,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved', payload: UserFormResult): void
}>()

const { t } = useI18n()
const isEdit = computed(() => !!props.user)

const createSchema = z.object({
  email: z.email(t('auth.invalidEmail')),
  name: z.string().optional(),
  role: z.enum(['admin', 'partner', 'owner', 'editor']),
})

const editSchema = z.object({
  email: z.string().optional(),
  name: z.string().optional(),
  role: z.enum(['admin', 'partner', 'owner', 'editor']),
})

type CreateSchema = z.output<typeof createSchema>
type EditSchema = z.output<typeof editSchema>
type SubmitSchema = CreateSchema | EditSchema

const state = reactive({
  email: '',
  name: '',
  role: 'editor' as UserRole,
})

const roleOptions: UserRole[] = ['admin', 'partner', 'owner', 'editor']
const loading = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.user,
  (user) => {
    state.email = user?.email ?? ''
    state.name = user?.name ?? ''
    state.role = user?.role ?? 'editor'
    error.value = null
  },
  { immediate: true },
)

async function onSubmit(payload: FormSubmitEvent<SubmitSchema>) {
  loading.value = true
  error.value = null

  try {
    if (isEdit.value && props.user) {
      const user = await $fetch<UserFormUser>(`/api/admin/users/${props.user.id}`, {
        method: 'PATCH',
        body: {
          name: payload.data.name || undefined,
          role: payload.data.role,
        },
      })

      emit('saved', { user })
    } else {
      const result = await $fetch<UserFormResult>('/api/admin/users', {
        method: 'POST',
        body: {
          email: payload.data.email,
          name: payload.data.name || undefined,
          role: payload.data.role,
        },
      })

      emit('saved', result)
    }

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
    :title="isEdit ? t('users.editUser') : t('users.createUser')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error" class="mb-4" />

      <UForm
        :schema="isEdit ? editSchema : createSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField :label="t('auth.email')" name="email" required>
          <UInput v-model="state.email" type="email" class="w-full" :disabled="isEdit" />
        </UFormField>

        <UFormField :label="t('users.name')" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField :label="t('users.role')" name="role" required>
          <USelect v-model="state.role" :items="roleOptions" class="w-full" />
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
