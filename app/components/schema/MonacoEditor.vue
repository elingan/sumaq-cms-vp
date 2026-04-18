<template>
  <div class="schema-monaco-editor">
    <div ref="container" class="schema-monaco-editor__surface" />
  </div>
</template>

<script setup lang="ts">
import type * as MonacoEditor from 'monaco-editor'

interface Props {
  modelValue: string
  language?: string
  height?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  language: 'yaml',
  height: '62vh',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const container = ref<HTMLDivElement | null>(null)
const editor = shallowRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null)
const monaco = shallowRef<typeof MonacoEditor | null>(null)
const editorHeight = computed(() => props.height)

async function mountEditor() {
  if (!container.value || editor.value) {
    return
  }

  const monacoModule = await import('monaco-editor')
  monaco.value = monacoModule
  editor.value = monacoModule.editor.create(container.value, {
    value: props.modelValue,
    language: props.language,
    automaticLayout: true,
    readOnly: props.disabled,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbersMinChars: 3,
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    tabSize: 2,
    theme: 'vs',
  })

  editor.value.onDidChangeModelContent(() => {
    const nextValue = editor.value?.getValue() ?? ''
    if (nextValue !== props.modelValue) {
      emit('update:modelValue', nextValue)
    }
  })
}

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) {
      return
    }

    const currentValue = editor.value.getValue()
    if (currentValue !== value) {
      editor.value.setValue(value)
    }
  },
)

watch(
  () => props.disabled,
  (disabled) => {
    editor.value?.updateOptions({ readOnly: disabled })
  },
)

watch(
  () => props.language,
  (language) => {
    const model = editor.value?.getModel()
    if (model && monaco.value) {
      monaco.value.editor.setModelLanguage(model, language)
    }
  },
)

onMounted(() => {
  mountEditor()
})

onBeforeUnmount(() => {
  editor.value?.dispose()
})
</script>

<style scoped>
.schema-monaco-editor {
  width: 100%;
}

.schema-monaco-editor__surface {
  width: 100%;
  height: v-bind(editorHeight);
  overflow: hidden;
  border-radius: 1rem;
}
</style>
