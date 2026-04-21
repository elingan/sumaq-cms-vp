export type ContextualPathSegment = string | number

export function buildContextualPath(segments: ContextualPathSegment[]) {
  return segments.map((segment) => String(segment)).join('.')
}

export function getValueAtContextualPath(root: unknown, segments: ContextualPathSegment[]) {
  return segments.reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string | number, unknown>)[segment]
  }, root)
}

export function setValueAtContextualPath<T extends object>(
  root: T,
  segments: ContextualPathSegment[],
  value: unknown,
): T {
  if (!segments.length) {
    return root
  }

  const clone = Array.isArray(root) ? ([...root] as unknown as T) : ({ ...root } as T)
  let current: Record<string | number, unknown> = clone as Record<string | number, unknown>

  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index]!
    const nextSegment = segments[index + 1]!
    const existing = current[segment]

    const nextValue = Array.isArray(existing)
      ? [...existing]
      : existing && typeof existing === 'object'
        ? { ...(existing as Record<string, unknown>) }
        : typeof nextSegment === 'number'
          ? []
          : {}

    current[segment] = nextValue
    current = nextValue as Record<string | number, unknown>
  }

  current[segments[segments.length - 1]!] = value
  return clone
}
