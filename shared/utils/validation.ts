import type { ZodIssue } from 'zod'

export interface FieldError {
  message: string
  code: string
  path: string
}

export function formatZodErrors(
  issues: ZodIssue[],
  getSectionLabel: (sectionId: string) => string,
  getFieldLabel: (sectionId: string, fieldId: string) => string | undefined,
): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {}

  for (const issue of issues) {
    const path = issue.path
    if (path.length === 0) continue

    const pathKey = path.join('.')

    const readablePath = path
      .map((segment, i) => {
        if (typeof segment === 'number') {
          return `Item ${segment + 1}`
        }

        if (i === 0) {
          return getSectionLabel(String(segment))
        }

        if (i === 1) {
          return getFieldLabel(String(path[0]), String(segment)) ?? String(segment)
        }

        return String(segment)
      })
      .join(' → ')

    errors[pathKey] = {
      message: issue.message,
      code: issue.code,
      path: readablePath,
    }
  }

  return errors
}

export function formatFieldError(error: FieldError): string {
  return `${error.path}: ${error.message}`
}
