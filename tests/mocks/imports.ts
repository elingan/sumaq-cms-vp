import { ref } from 'vue'
import { vi } from 'vitest'

type ToastEntry = {
  title?: string
  description?: string
  color?: string
  icon?: string
}

export const __toastAdd = vi.fn<(entry: ToastEntry) => void>()

export const __role = {
  canManageLocations: ref(true),
  canManageRooms: ref(true),
}

export function useToast() {
  return { add: __toastAdd }
}

export function useRole() {
  return __role
}

export function useI18n() {
  return {
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'bookingCalendar.searchResultsLabel' && params) {
        const count = params.count
        const total = params.total
        if (typeof count === 'number' && typeof total === 'number') {
          return `${count} / ${total}`
        }
      }

      if (params && typeof params.name === 'string') {
        return `${key}:${params.name}`
      }

      return key
    },
  }
}

export function __resetNuxtMocks() {
  __toastAdd.mockClear()
  __role.canManageLocations.value = true
  __role.canManageRooms.value = true
}
