import type { Ref } from 'vue'

import type { FieldType, FormState } from './schema'

export type ContextualEditableMode = 'form' | 'contextual' | 'both'

export interface ContextualTargetRect {
  top: number
  left: number
  width: number
  height: number
  right: number
  bottom: number
}

export interface ContextualEditableTarget {
  id: string
  sectionId: string
  fieldId: string
  path: string
  valuePath: Array<string | number>
  schemaPath: string[]
  label: string
  type: FieldType
  description?: string
  helpText?: string
}

export interface ContextualTargetState {
  hoveredTargetId: string | null
  selectedTargetId: string | null
  overlayRect: ContextualTargetRect | null
  drawerOpen: boolean
  isContextualMode: boolean
}

export interface ContextualEditorSnapshot extends ContextualTargetState {
  selectedValue: unknown
  isDirty: boolean
  totalTargets: number
}

export interface ContextualEditorOptions {
  sections: Ref<import('./schema').SchemaSection[]>
  formState: Ref<FormState>
  initialMode?: boolean
}
