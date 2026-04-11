---
applyTo: 'app/components/**/*.vue'
---

# Vue Component Conventions for Sumaq CMS

## Script Setup Pattern

Always use `<script setup>` with TypeScript:

```vue
<template>
  <div class="component-container">
    <UCard>
      <template #header>
        <h2>{{ title }}</h2>
      </template>

      <div v-if="isLoading">
        <ULoadingSpinner />
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton @click="handleUpdate('action')" :loading="isLoading"> Action </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props definition
interface Props {
  title: string
  count?: number
  items: Array<{ id: string; label: string }>
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
})

// Emits
const emit = defineEmits<{
  (e: 'update', value: string): void
  (e: 'delete', id: string): void
}>()

// Reactive state
const isLoading = ref(false)
const searchQuery = ref('')

// Computed
const filteredItems = computed(() => {
  return props.items.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

// Methods
async function handleUpdate(value: string) {
  isLoading.value = true
  try {
    emit('update', value)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.component-container {
  @apply p-4;
}
</style>
```

## Nuxt UI Components

Use Nuxt UI components prefixed with `U` and follow the documented usage patterns:

| Component     | Usage                 |
| ------------- | --------------------- |
| `UButton`     | Buttons with variants |
| `UInput`      | Text inputs           |
| `UTextarea`   | Multi-line text       |
| `USelect`     | Dropdown select       |
| `UCheckbox`   | Checkbox              |
| `URadioGroup` | Radio buttons         |
| `UCard`       | Card container        |
| `UTable`      | Table with data       |
| `UModal`      | Modal dialog          |
| `UAlert`      | Alert messages        |
| `UTabs`       | Tab navigation        |
| `UBadge`      | Status badges         |
| `UAvatar`     | User avatars          |
| `USkeleton`   | Loading skeletons     |

## Naming Conventions

| Type        | Convention | Example                    |
| ----------- | ---------- | -------------------------- |
| Components  | PascalCase | `SiteCard.vue`             |
| Props       | camelCase  | `siteId`, `isActive`       |
| Events      | kebab-case | `@update:model-value`      |
| Slots       | kebab-case | `#header`, `#footer`       |
| CSS classes | kebab-case | `site-card`, `btn-primary` |

## Props Validation

Always validate props with TypeScript interfaces:

```typescript
interface Props {
  site: {
    id: string
    name: string
    url: string
    status: 'active' | 'archived'
  }
  isEditable?: boolean
}

const props = defineProps<Props>()
```

## Async Data Fetching

Use `useFetch` or `useAsyncData`:

```vue
<script setup lang="ts">
const route = useRoute()
const siteId = route.params.id as string

// Fetch site data
const {
  data: site,
  pending,
  error,
  refresh,
} = await useFetch(() => `/api/sites/${siteId}`, {
  key: `site-${siteId}`,
  transform: (data) => data.site,
})

// Manual refresh
async function refreshData() {
  await refresh()
}
</script>
```

## Form Handling

Use `useForm` composable pattern:

```vue
<script setup lang="ts">
const form = reactive({
  name: '',
  email: '',
})

const { status, errors, handleSubmit } = useForm({
  fields: form,
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  }),
  onSubmit: async (values) => {
    await $fetch('/api/sites', {
      method: 'POST',
      body: values,
    })
    navigateTo('/dashboard')
  },
})
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <UFormField label="Name" :error="errors.name">
      <UInput v-model="form.name" />
    </UFormField>
    <UFormField label="Email" :error="errors.email">
      <UInput v-model="form.email" type="email" />
    </UFormField>
    <UButton type="submit" :loading="status === 'pending'"> Submit </UButton>
  </form>
</template>
```

## Error Handling

Display errors with UAlert:

```vue
<script setup lang="ts">
const { data, error } = await useFetch('/api/data')

// Error display
const errorMessage = computed(() => {
  if (error.value) {
    return error.value.data?.message || 'An error occurred'
  }
  return null
})
</script>

<template>
  <div>
    <UAlert v-if="errorMessage" color="error" :title="errorMessage" />
    <div v-else>{{ data }}</div>
  </div>
</template>
```

## Loading States

Use skeletons and spinners:

```vue
<template>
  <div>
    <!-- Skeleton while loading -->
    <template v-if="pending">
      <USkeleton class="h-4 w-full mb-2" />
      <USkeleton class="h-4 w-3/4" />
    </template>

    <!-- Content when loaded -->
    <div v-else-if="data">
      {{ data.content }}
    </div>
  </div>
</template>
```

## Accessibility

Always include:

- Proper ARIA labels
- Keyboard navigation
- Focus states
- Screen reader text

```vue
<template>
  <button class="btn" aria-label="Delete site" @click="handleDelete">
    <span class="sr-only">Delete</span>
    <Icon name="trash" />
  </button>
</template>
```
