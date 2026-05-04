interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResult[]
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognition }
    webkitSpeechRecognition?: { new (): SpeechRecognition }
  }
}

export function useSpeechRecognition(options: { lang?: string } = {}) {
  const isSupported = ref(false)
  const isListening = ref(false)
  const transcript = ref('')
  const error = ref<string | null>(null)

  let recognition: SpeechRecognition | null = null

  onMounted(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition

    isSupported.value = !!SpeechRecognitionAPI

    if (!SpeechRecognitionAPI) {
      error.value = 'Speech recognition not supported in this browser'
      return
    }

    recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = options.lang || 'es-ES'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue
        if (result.isFinal) {
          transcript.value += result[0]?.transcript ?? ''
        } else {
          interim += result[0]?.transcript ?? ''
        }
      }

      if (interim) {
        const el = document.querySelector(`[data-speech-target]`) as HTMLTextAreaElement | null
        if (el) {
          const baseLength = transcript.value.length
          el.value = transcript.value + interim
          el.setSelectionRange(baseLength, baseLength + interim.length)
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      error.value = event.error
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
    }
  })

  onUnmounted(() => {
    recognition?.abort()
  })

  function start(targetSelector?: string) {
    if (!recognition || isListening.value) return

    transcript.value = ''
    error.value = null
    isListening.value = true

    if (targetSelector) {
      const el = document.querySelector(targetSelector) as HTMLTextAreaElement | null
      if (el) {
        el.setAttribute('data-speech-target', '')
      }
    }

    recognition.start()
  }

  function stop() {
    recognition?.stop()
    isListening.value = false
  }

  function toggle(targetSelector?: string) {
    if (isListening.value) {
      stop()
    } else {
      start(targetSelector)
    }
  }

  return {
    isSupported,
    isListening,
    transcript,
    error,
    start,
    stop,
    toggle,
  }
}
