export type EditorStatus = 'idle' | 'loading' | 'saving' | 'success' | 'error'

export interface EditorState<T> {
  status: EditorStatus
  data: T | null
  error: string | null
  isLoading: boolean
  isSaving: boolean
}

export function useEditorState<T>() {
  const status = ref<EditorStatus>('idle')
  const data = ref<T | null>(null)
  const error = ref<string | null>(null)

  const isLoading = computed(() => status.value === 'loading')
  const isSaving = computed(() => status.value === 'saving')
  const isSuccess = computed(() => status.value === 'success')
  const isError = computed(() => status.value === 'error')
  const isIdle = computed(() => status.value === 'idle')

  function setLoading() {
    status.value = 'loading'
    error.value = null
  }

  function setSuccess(newData?: T) {
    status.value = 'success'
    if (newData !== undefined) {
      data.value = newData
    }
    error.value = null
  }

  function setError(message: string) {
    status.value = 'error'
    error.value = message
  }

  function setSaving() {
    status.value = 'saving'
    error.value = null
  }

  function reset() {
    status.value = 'idle'
    data.value = null
    error.value = null
  }

  function asResult(): EditorState<T> {
    return {
      status: status.value,
      data: data.value,
      error: error.value,
      isLoading: isLoading.value,
      isSaving: isSaving.value,
    }
  }

  return {
    status,
    data,
    error,
    isLoading,
    isSaving,
    isSuccess,
    isError,
    isIdle,
    setLoading,
    setSuccess,
    setError,
    setSaving,
    reset,
    asResult,
  }
}
