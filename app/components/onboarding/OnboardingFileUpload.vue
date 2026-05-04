<template>
  <UFormField :label="field.label" :hint="field.hint">
    <div
      class="border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer"
      :class="[
        isDragging
          ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-950/20 scale-[1.01]'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/50',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="acceptTypes"
        :multiple="field.type === 'multi-file'"
        class="hidden"
        @change="handleFileSelect"
      />

      <div v-if="uploadedFiles.length === 0">
        <div
          class="size-14 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
        >
          <UIcon name="i-lucide-cloud-upload" class="size-6 text-slate-400" />
        </div>
        <p class="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
          {{ $t('onboarding.dropFiles') }}
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500">
          {{ field.hint }}
        </p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="(file, i) in uploadedFiles"
          :key="i"
          class="flex items-center justify-between gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0"
            >
              <UIcon
                :name="file.type === 'application/pdf' ? 'i-lucide-file-text' : 'i-lucide-image'"
                class="size-4 text-slate-500"
              />
            </div>
            <div class="min-w-0">
              <p class="text-sm truncate text-slate-700 dark:text-slate-200">{{ file.fileName }}</p>
              <p class="text-xs text-slate-400">
                <template v-if="file.uploading">{{ $t('onboarding.listening') }}...</template>
                <template v-else-if="file.url">Subido</template>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0" @click.stop>
            <UIcon
              v-if="file.uploading"
              name="i-lucide-loader-circle"
              class="size-4 animate-spin text-slate-400"
            />
            <UIcon
              v-else-if="file.url"
              name="i-lucide-check-circle"
              class="size-4 text-green-500"
            />
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              size="xs"
              square
              color="neutral"
              @click="removeFile(i)"
            />
          </div>
        </div>
        <UButton
          v-if="field.type === 'multi-file'"
          variant="outline"
          size="sm"
          :label="$t('onboarding.addMore')"
          @click.stop="fileInput?.click()"
        />
      </div>
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import type { OnboardingFieldDef } from '~/composables/useOnboarding'

interface UploadedFile {
  fileName: string
  type: string
  url: string | null
  blobPath: string | null
  uploading: boolean
}

const props = defineProps<{
  field: OnboardingFieldDef
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const uploadedFiles = ref<UploadedFile[]>([])

const acceptTypes = computed(() => {
  if (props.field.key === 'cvFile') return '.pdf'
  return 'image/jpeg,image/png,image/webp'
})

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files) uploadFiles(Array.from(files))
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files) uploadFiles(Array.from(files))
  target.value = ''
}

async function uploadFiles(files: File[]) {
  for (const file of files) {
    const entry: UploadedFile = {
      fileName: file.name,
      type: file.type,
      url: null,
      blobPath: null,
      uploading: true,
    }

    uploadedFiles.value.push(entry)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await $fetch(`/api/onboarding/upload/${props.field.key}`, {
        method: 'POST',
        body: formData,
      })

      entry.url = (result as any).url
      entry.blobPath = (result as any).blobPath
      entry.uploading = false

      if (entry.url) {
        const urls = [...props.modelValue, entry.url]
        emit('update:modelValue', urls)
      }
    } catch {
      entry.uploading = false
      uploadedFiles.value = uploadedFiles.value.filter((f) => f !== entry)
    }
  }
}

function removeFile(index: number) {
  const urls = [...props.modelValue]
  urls.splice(index, 1)
  emit('update:modelValue', urls)
  uploadedFiles.value.splice(index, 1)
}
</script>
