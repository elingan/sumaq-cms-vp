interface ContentType {
  type: 'page' | 'blog'
  name: string
}

export const useContentTypes = () => {
  const {
    data: contentTypes,
    pending,
    error,
    refresh,
  } = useAsyncData<ContentType[]>('content-types', () => $fetch('/api/cms'))

  return {
    contentTypes,
    pending,
    error,
    refresh,
  }
}
